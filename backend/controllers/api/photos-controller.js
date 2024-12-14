// backend/controllers/api/photos-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { Serializer } from "jsonapi-serializer";
import { runOsxphotosExportImages } from "../../utils/export-images.js";
import { getNestedProperty } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll define two serializers: one for person and one for photo.
const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

const PhotoSerializer = new Serializer("photo", {
  id: "uuid",
  attributes: [
    "originalName",
    "originalFilename",
    "exportedFilename",
    "filename",
    "score",
    "exifInfo",
  ],
  keyForAttribute: "camelCase",
  relationships: {
    album: {
      type: "album",
    },
    persons: {
      type: "person",
    },
  },
  pluralizeType: false,
  meta: {}, // We'll add meta later
});

function formatPhotoDateWithOffset(dateString) {
  const match = dateString.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)([\+\-]\d{2}:\d{2})$/
  );
  if (!match) {
    return fallbackFormat(new Date(dateString));
  }

  const datePart = match[1];
  const timePart = match[2];

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, secondRaw] = timePart.split(":");
  const hourNum = Number(hour);
  const minuteNum = Number(minute);
  const secondNum = Math.floor(Number(secondRaw));

  const YYYY = String(year);
  const MM = String(month).padStart(2, "0");
  const DD = String(day).padStart(2, "0");
  const HH = String(hourNum).padStart(2, "0");
  const mm = String(minuteNum).padStart(2, "0");
  const ss = String(secondNum).padStart(2, "0");

  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

function fallbackFormat(dateObj) {
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");
  const HH = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

export const getPhotosByAlbumData = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");
    const imagesDir = path.join(photosDir, "images");
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_photos_in_album.py"
    );
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    if (!(await fs.pathExists(photosPath))) {
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    const photosData = await fs.readJson(photosPath);

    // Add 'originalName' and 'exportedFilename'
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
      const prefix = formatPhotoDateWithOffset(photo.date);
      photo.exportedFilename = `${prefix}-${photo.originalName}.jpg`;
      if (!Array.isArray(photo.persons)) {
        photo.persons = [];
      }
    });

    const scoreAttributes = Object.keys(photosData[0].score);

    // Sort photos
    photosData.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Add album relationship
    photosData.forEach((photo) => {
      photo.album = albumUUID;
    });

    // Handle person relationships
    const uniquePersons = new Map();
    function slugifyName(name) {
      return name
        .toLowerCase()
        .replace(/[\s+]/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    photosData.forEach((photo) => {
      photo.personsData = [];
      photo.persons.forEach((name) => {
        const slug = slugifyName(name);
        if (!uniquePersons.has(slug)) {
          uniquePersons.set(slug, { id: slug, name });
        }
        photo.personsData.push({ type: "person", id: slug });
      });
    });

    // Serialize photos
    const jsonApiPhotoData = PhotoSerializer.serialize(photosData);

    // Serialize persons
    const personsArray = Array.from(uniquePersons.values());
    const jsonApiPersonData = PersonSerializer.serialize(personsArray);

    // Merge included resources
    const merged = {
      data: jsonApiPhotoData.data,
      included: jsonApiPersonData.data,
      meta: {
        albumUUID,
        sortAttribute,
        sortOrder,
        scoreAttributes,
      },
    };

    // Link persons to photos
    merged.data.forEach((photo) => {
      const originalPhoto = photosData.find((p) => p.uuid === photo.id);
      if (
        originalPhoto &&
        originalPhoto.personsData &&
        originalPhoto.personsData.length > 0
      ) {
        if (!photo.relationships) {
          photo.relationships = {};
        }
        photo.relationships.persons = {
          data: originalPhoto.personsData,
        };
      } else {
        if (photo.relationships && photo.relationships.persons) {
          photo.relationships.persons = { data: [] };
        }
      }
    });

    res.json(merged);
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};
