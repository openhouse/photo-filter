// backend/controllers/api/people-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { Serializer } from "jsonapi-serializer";
import {
  getNestedProperty,
  formatPreciseTimestamp,
} from "../../utils/helpers.js";
import { exportByUuids } from "../../utils/export-images.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PhotoSerializer = new Serializer("photo", {
  id: "uuid",
  attributes: [
    "originalName",
    "originalFilename",
    "filename",
    "exportedFilename",
    "score",
    "exifInfo",
    "persons",
  ],
  keyForAttribute: "camelCase",
  relationships: {
    album: {
      type: "album",
    },
  },
  pluralizeType: false,
});

const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// List all people in an album
export const getPeopleInAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res.status(404).json({
        errors: [{ detail: "Album not found or no photos available" }],
      });
    }

    const photosData = await fs.readJson(photosPath);

    // Extract all persons from all photos
    const allPersons = new Set();
    for (const photo of photosData) {
      if (Array.isArray(photo.persons)) {
        photo.persons.forEach((p) => allPersons.add(p));
      }
    }

    res.json({ data: Array.from(allPersons) });
  } catch (error) {
    console.error("Error fetching people in album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

// Get photos of a specific person in the album
export const getPhotosByPerson = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const personName = req.params.personName;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res.status(404).json({
        errors: [{ detail: "Album not found or no photos available" }],
      });
    }

    const photosData = await fs.readJson(photosPath);

    // Filter photos by personName
    const filteredPhotos = photosData.filter((photo) => {
      if (!Array.isArray(photo.persons)) return false;
      return photo.persons.includes(personName);
    });

    if (filteredPhotos.length === 0) {
      return res.json({
        data: [],
        meta: {
          albumUUID,
          personName,
          sortAttribute,
          sortOrder,
          scoreAttributes: [],
        },
      });
    }

    // Add originalName and exportedFilename properties
    filteredPhotos.forEach((photo) => {
      const originalName = path.parse(photo.original_filename).name;
      const ts = formatPreciseTimestamp(photo.date);
      photo.originalName = originalName;
      photo.exportedFilename = `${ts}-${originalName}.jpg`;
    });

    const scoreAttributes = Object.keys(filteredPhotos[0].score);

    filteredPhotos.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    filteredPhotos.forEach((photo) => {
      photo.album = albumUUID;
    });

    const jsonApiData = PhotoSerializer.serialize(filteredPhotos);

    res.json({
      ...jsonApiData,
      meta: {
        albumUUID,
        personName,
        sortAttribute,
        sortOrder,
        scoreAttributes,
      },
    });
  } catch (error) {
    console.error("Error fetching photos for person:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

// List all people across the entire library
export const getAllPeople = async (_req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      return res.status(404).json({
        errors: [{ detail: "No albums found" }],
      });
    }

    const albumEntries = await fs.readdir(albumsDir, { withFileTypes: true });
    const allPersons = new Set();

    for (const entry of albumEntries) {
      if (!entry.isDirectory()) continue;
      const photosPath = path.join(albumsDir, entry.name, "photos.json");
      if (!(await fs.pathExists(photosPath))) continue;

      const photos = await fs.readJson(photosPath);
      photos.forEach((photo) => {
        if (Array.isArray(photo.persons)) {
          photo.persons.forEach((p) => allPersons.add(p));
        }
      });
    }

    const persons = Array.from(allPersons).map((name) => ({
      id: slugifyName(name),
      name,
    }));

    const jsonApi = PersonSerializer.serialize(persons);
    res.json(jsonApi);
  } catch (error) {
    console.error("Error fetching all people:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

// Get photos of a specific person across the entire library
export const getPhotosByPersonLibrary = async (req, res) => {
  try {
    const personName = req.params.personName;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";
    const solo = req.query.solo === "true";
    const UNKNOWN_PERSON = "_UNKNOWN_";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      return res.status(404).json({
        errors: [{ detail: "No albums found" }],
      });
    }

    const albumEntries = await fs.readdir(albumsDir, { withFileTypes: true });
    const filteredPhotos = [];

    for (const entry of albumEntries) {
      if (!entry.isDirectory()) continue;
      const albumUUID = entry.name;
      const photosPath = path.join(albumsDir, albumUUID, "photos.json");
      if (!(await fs.pathExists(photosPath))) continue;

      const photos = await fs.readJson(photosPath);

      for (const photo of photos) {
        if (!Array.isArray(photo.persons)) continue;
        if (!photo.persons.includes(personName)) continue;

        if (solo) {
          const others = photo.persons.filter((p) => p !== personName);
          if (others.some((p) => p && p !== UNKNOWN_PERSON)) continue;
        }

        const originalName = path.parse(photo.original_filename).name;
        const ts = formatPreciseTimestamp(photo.date);
        photo.originalName = originalName;
        photo.exportedFilename = `${ts}-${originalName}.jpg`;
        photo.album = albumUUID;
        filteredPhotos.push(photo);
      }
    }

    if (filteredPhotos.length === 0) {
      return res.json({
        data: [],
        meta: {
          personName,
          sortAttribute,
          sortOrder,
          solo,
          scoreAttributes: [],
        },
      });
    }

    const scoreAttributes = Object.keys(filteredPhotos[0].score);

    filteredPhotos.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Ensure images exist for all filtered photos
    const missingByAlbum = new Map();
    for (const p of filteredPhotos) {
      const albumImages = path.join(albumsDir, p.album, "images");
      const dst = path.join(albumImages, p.exportedFilename);
      if (!(await fs.pathExists(dst))) {
        const set = missingByAlbum.get(p.album) ?? new Set();
        set.add(p.uuid);
        missingByAlbum.set(p.album, set);
      }
    }

    const venvDir = path.join(__dirname, "..", "..", "venv");
    const osxphotos = path.join(venvDir, "bin", "osxphotos");
    for (const [albumUUID, uuidSet] of missingByAlbum.entries()) {
      const albumImages = path.join(albumsDir, albumUUID, "images");
      await exportByUuids(osxphotos, albumImages, [...uuidSet]);
    }

    const jsonApiData = PhotoSerializer.serialize(filteredPhotos);

    res.json({
      ...jsonApiData,
      meta: {
        personName,
        sortAttribute,
        sortOrder,
        solo,
        scoreAttributes,
      },
    });
  } catch (error) {
    console.error("Error fetching photos for person across library:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};
