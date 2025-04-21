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

    // ===== 1) Handle "missing photos.json" gracefully =====
    const exists = await fs.pathExists(photosPath);
    if (!exists) {
      console.warn(
        `Warning: photos.json not found for album ${albumUUID}. Returning empty results.`
      );

      // Optionally, you could attempt to re-run the Python export here:
      // await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      // await runOsxphotosExportImages(osxphotosPath, albumUUID, imagesDir, photosPath);

      // If re-running is undesired, we'll just create an empty file, so subsequent calls won't 500:
      await fs.writeJson(photosPath, []); // empty array
    }

    // Read the array from photos.json (which might now be `[]`)
    let photosData = await fs.readJson(photosPath);

    // Guard: If there's truly no photos, respond with an empty JSON:API set
    if (!Array.isArray(photosData) || photosData.length === 0) {
      const emptyResponse = {
        data: [],
        included: [],
        meta: {
          albumUUID,
          sortAttribute,
          sortOrder,
          scoreAttributes: [],
        },
      };
      return res.json(emptyResponse);
    }

    // ===== 2) Deduplicate if needed =====
    photosData = deduplicatePhotos(photosData);

    // ===== 3) Build a final 'exportedFilename' field per photo. =====
    const uniquePersons = new Map();
    photosData.forEach((photo) => {
      // For display in the UI
      photo.originalName = path.parse(photo.original_filename).name;

      // Provide an exportedFilename: "YYYYMMDD-HHMMSS-<originalName>.jpg"
      const prefix = formatPhotoDateWithOffset(photo.date);
      photo.exportedFilename = `${prefix}-${photo.originalName}.jpg`;

      // If photo.persons is missing or not an array, treat it as empty
      if (!Array.isArray(photo.persons)) {
        photo.persons = [];
      }

      // Collect persons so they appear in JSON:API "included"
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

    // If at least one photo has a 'score' object, let's gather them
    let scoreAttributes = [];
    if (photosData.length > 0 && photosData[0].score) {
      scoreAttributes = Object.keys(photosData[0].score);
    }

    // ===== 4) Sort according to sortAttribute & sortOrder =====
    photosData.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // ===== 5) Serialize the photos into JSON:API format =====
    const jsonApiPhotoData = PhotoSerializer.serialize(photosData);

    // ===== 6) Serialize the persons too =====
    const personsArray = Array.from(uniquePersons.values());
    const jsonApiPersonData = PersonSerializer.serialize(personsArray);

    // ===== 7) Combine data + included in one payload =====
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

    // Also wire up the "persons" relationship for each photo
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
      // Merge persons
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
    // fallback if it doesn't match the pattern
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
