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
  },
  pluralizeType: false,
});

/**
 * Format the photo's date/time including its timezone offset to match
 * the osxphotos "{created.strftime,%Y%m%d-%H%M%S}" logic. This ensures
 * exportedFilename matches exactly what osxphotos produces.
 *
 * @param {string} dateString - The photo.date string with timezone, e.g. "2022-11-06 17:52:18.936800+01:00"
 * @returns {string} The formatted date/time string "YYYYMMDD-HHMMSS"
 */
function formatPhotoDateWithOffset(dateString) {
  // Example: "2022-11-06 17:52:18.936800+01:00"
  const match = dateString.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)([\+\-]\d{2}:\d{2})$/
  );
  if (!match) {
    // Fallback if the format doesn't match
    return fallbackFormat(new Date(dateString));
  }

  const datePart = match[1]; // "YYYY-MM-DD"
  const timePart = match[2]; // "HH:MM:SS.fff"
  const offsetPart = match[3]; // "+01:00" or similar

  // The date/time plus offset describes local photo time.
  // Parse out year, month, day, hour, minute, second from datePart/timePart:
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

    // If photos.json doesn't exist, export metadata and images first
    if (!(await fs.pathExists(photosPath))) {
      // Export metadata
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);

      // Export images using osxphotos with date/time prefix:
      // {created.strftime,%Y%m%d-%H%M%S}-{original_name}.jpg
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    const photosData = await fs.readJson(photosPath);

    // Add 'originalName' and 'exportedFilename'
    // exportedFilename = "YYYYMMDD-HHMMSS-{originalName}.jpg"
    // Match exactly what osxphotos created.
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
      const prefix = formatPhotoDateWithOffset(photo.date);
      photo.exportedFilename = `${prefix}-${photo.originalName}.jpg`;
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

    photosData.forEach((photo) => {
      photo.album = albumUUID;
    });

    const jsonApiData = PhotoSerializer.serialize(photosData);
    res.json({
      ...jsonApiData,
      meta: {
        albumUUID,
        sortAttribute,
        sortOrder,
        scoreAttributes,
      },
    });
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};
