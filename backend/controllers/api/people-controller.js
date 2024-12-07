// backend/controllers/api/people-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { execCommand } from "../../utils/exec-command.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll reuse the PhotoSerializer from photos-controller or create a new one here.
const PhotoSerializer = new Serializer("photo", {
  id: "uuid",
  attributes: [
    "originalName",
    "originalFilename",
    "filename",
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

// Helper function to safely get nested property
function getNestedProperty(obj, propertyPath) {
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}

// List all people in an album
export const getPeopleInAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res
        .status(404)
        .json({
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

    // Return the list of people as a simple JSON structure
    // Not JSON:API, just a simple array for now (we could also do JSON:API if desired)
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
    const sortAttribute = req.query.sort || "score.overall"; // Default
    const sortOrder = req.query.order || "desc"; // Default

    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res
        .status(404)
        .json({
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

    // Add originalName property
    filteredPhotos.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
    });

    // Extract score attributes from first photo
    const scoreAttributes = Object.keys(filteredPhotos[0].score);

    // Sort the photos
    filteredPhotos.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Add album relationship
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
