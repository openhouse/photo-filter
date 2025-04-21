// backend/controllers/api/photos-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../../utils/export-images.js";
import { getNestedProperty } from "../../utils/helpers.js";
import { execCommand } from "../../utils/exec-command.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    "exportedFilename", // used in <img src>
    "filename",
    "score",
    "exifInfo",
  ],
  keyForAttribute: "camelCase",
  relationships: {
    album: { type: "album" },
    persons: { type: "person" },
  },
  pluralizeType: false,
  meta: {},
});

export async function getPhotosByAlbumData(req, res) {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    // Paths
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

    // Ensure album directory (and images directory) exist
    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    // If photos.json doesn't exist, create it by running the Python export
    const exists = await fs.pathExists(photosPath);
    if (!exists) {
      console.warn(
        `photos.json not found for album ${albumUUID}. Attempting export...`
      );
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    // Read the array from photos.json
    let photosData = await fs.readJson(photosPath);

    // If the file is present but empty, attempt export again
    if (Array.isArray(photosData) && photosData.length === 0) {
      console.warn(
        `photos.json is empty for album ${albumUUID}. Re-running python export...`
      );
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );

      // re-read the photos
      photosData = await fs.readJson(photosPath);

      if (!Array.isArray(photosData) || photosData.length === 0) {
        console.warn(
          `Even after re-export, album ${albumUUID} has 0 photos. Returning empty JSON:API response.`
        );
        return res.json({
          data: [],
          included: [],
          meta: {
            albumUUID,
            sortAttribute,
            sortOrder,
            scoreAttributes: [],
          },
        });
      }
    }

    // If still not an array, or still empty, bail out
    if (!Array.isArray(photosData) || photosData.length === 0) {
      return res.json({
        data: [],
        included: [],
        meta: {
          albumUUID,
          sortAttribute,
          sortOrder,
          scoreAttributes: [],
        },
      });
    }

    // Deduplicate if needed
    photosData = deduplicatePhotos(photosData);

    // Build a final 'exportedFilename' field
    const uniquePersons = new Map();
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;

      const prefix = formatPhotoDateWithOffset(photo.date);
      photo.exportedFilename = `${prefix}-${photo.originalName}.jpg`;

      // Ensure we have an array of persons
      if (!Array.isArray(photo.persons)) {
        photo.persons = [];
      }
      // Build a "personsData" array for JSON:API relationships
      photo.personsData = photo.persons.map((personName) => {
        const slug = slugifyName(personName);
        if (!uniquePersons.has(slug)) {
          uniquePersons.set(slug, { id: slug, name: personName });
        }
        return { type: "person", id: slug };
      });

      // Link photo to the album
      photo.album = albumUUID;
    });

    // Gather scoreAttributes from the first photo’s 'score' object
    let scoreAttributes = [];
    if (photosData.length > 0 && photosData[0].score) {
      scoreAttributes = Object.keys(photosData[0].score);
    }

    // Sort by sortAttribute
    photosData.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Serialize photos
    const jsonApiPhotoData = PhotoSerializer.serialize(photosData);

    // Serialize unique persons
    const personsArray = Array.from(uniquePersons.values());
    const jsonApiPersonData = PersonSerializer.serialize(personsArray);

    // Build final merged structure
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

    // Wire up "persons" relationship for each photo
    merged.data.forEach((photo) => {
      const original = photosData.find((p) => p.uuid === photo.id);
      if (original && original.personsData?.length) {
        photo.relationships = photo.relationships || {};
        photo.relationships.persons = { data: original.personsData };
      } else {
        photo.relationships = photo.relationships || {};
        photo.relationships.persons = { data: [] };
      }
    });

    return res.json(merged);
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    return res.status(500).json({
      errors: [{ detail: "Internal Server Error", message: error.toString() }],
    });
  }
}

/** Helper: unify duplicates if needed. */
function deduplicatePhotos(photos) {
  const map = new Map();
  for (const photo of photos) {
    const key = `${photo.original_filename}-${photo.date}`;
    if (!map.has(key)) {
      map.set(key, { ...photo });
    } else {
      const existing = map.get(key);
      if (Array.isArray(photo.persons)) {
        const oldSet = new Set(existing.persons || []);
        photo.persons.forEach((p) => oldSet.add(p));
        existing.persons = Array.from(oldSet);
      }
      map.set(key, existing);
    }
  }
  return Array.from(map.values());
}

/** Helper: produce a date-based prefix from photo.date. */
function formatPhotoDateWithOffset(dateString) {
  const match = dateString.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+\-]\d{2}:\d{2})$/
  );
  if (!match) {
    return fallbackFormat(new Date(dateString));
  }
  const [_, datePart, timePart] = match;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, secondRaw] = timePart.split(":");
  const hh = Number(hour);
  const mm = Number(minute);
  const ss = Math.floor(Number(secondRaw));

  const YYYY = String(year).padStart(4, "0");
  const MM = String(month).padStart(2, "0");
  const DD = String(day).padStart(2, "0");
  const HH = String(hh).padStart(2, "0");
  const mmStr = String(mm).padStart(2, "0");
  const ssStr = String(ss).padStart(2, "0");

  return `${YYYY}${MM}${DD}-${HH}${mmStr}${ssStr}`;
}

function fallbackFormat(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return "UNKNOWNDATE";
  }
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");
  const HH = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
