// backend/controllers/api/photos-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import {
  loadUuidsFromFile,
  runOsxphotosExportImages,
} from "../../utils/export-images.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure 'type' is 'photo' and prevent pluralization
const PhotoSerializer = new Serializer("photo", {
  id: "uuid", // Use 'uuid' as the 'id' field
  attributes: [
    "originalName",
    "originalFilename",
    "filename",
    "score",
    "exifInfo",
  ],
  keyForAttribute: "camelCase",
  relationships: {
    album: {
      type: "album", // Use singular 'album' for the relationship
    },
  },
  pluralizeType: false, // Prevent automatic pluralization
});

export const getPhotosByAlbumData = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall"; // Default sort attribute
    const sortOrder = req.query.order || "desc"; // Default sort order

    // Paths
    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");
    const imagesDir = path.join(photosDir, "images");
    const uuidsFilePath = path.join(imagesDir, "uuids.txt");
    const skippedMarkerPath = path.join(imagesDir, ".skipped-empty");
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

    // Ensure directories exist
    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    let exportStatus = null;

    // Check if photos.json exists
    if (!(await fs.pathExists(photosPath))) {
      // Export photos metadata
      await runPythonScript(
        pythonPath,
        scriptPath,
        [albumUUID, uuidsFilePath],
        photosPath,
      );
      const uuids = await loadUuidsFromFile(uuidsFilePath);
      if (uuids.length === 0) {
        await fs.ensureFile(skippedMarkerPath);
        exportStatus = "skipped-empty";
      } else {
        const result = await runOsxphotosExportImages(
          osxphotosPath,
          albumUUID,
          imagesDir,
          uuidsFilePath,
        );
        if (result?.skippedReason === "empty-album") {
          exportStatus = "skipped-empty";
        }
      }

      // After exporting, rename files to prepend the photo's capture date
      await renameExportedImages(imagesDir, photosPath);
    }

    // Read photos data
    const photosData = await fs.readJson(photosPath);
    const albumCount = Array.isArray(photosData) ? photosData.length : 0;

    if (
      !exportStatus &&
      albumCount === 0 &&
      (await fs.pathExists(skippedMarkerPath))
    ) {
      exportStatus = "skipped-empty";
    }

    res.set("X-PF-Album-Count", String(albumCount));
    if (exportStatus) {
      res.set("X-PF-Export-Status", exportStatus);
    }

    // Add 'originalName' property to each photo
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
    });

    // Extract the list of score attributes
    const scoreAttributes =
      photosData.length > 0 && photosData[0].score
        ? Object.keys(photosData[0].score)
        : [];

    // Sort photos based on the requested attribute
    photosData.sort((a, b) => {
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
    photosData.forEach((photo) => {
      photo.album = albumUUID;
    });

    // Serialize data
    const jsonApiData = PhotoSerializer.serialize(photosData);

    // Send JSON response with photos and available score attributes
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

// Rename exported images with date-based filenames
async function renameExportedImages(imagesDir, photosPath) {
  const photosData = await fs.readJson(photosPath);

  for (const photo of photosData) {
    const originalName = path.parse(photo.original_filename).name; // e.g., DSCF1191
    const photoDate = new Date(photo.date); // Parse the photo’s date field
    const formattedDate = formatPhotoDate(photoDate); // YYYYMMDD-HHMMSS
    const oldPath = path.join(imagesDir, `${originalName}.jpg`);

    if (await fs.pathExists(oldPath)) {
      let newFilename = `${formattedDate}-${originalName}.jpg`;
      let finalPath = path.join(imagesDir, newFilename);

      // Check for collisions
      let counter = 1;
      while (await fs.pathExists(finalPath)) {
        newFilename = `${formattedDate}-${originalName}-${counter}.jpg`;
        finalPath = path.join(imagesDir, newFilename);
        counter++;
      }

      await fs.rename(oldPath, finalPath);
      console.log(`Renamed ${originalName}.jpg to ${newFilename}`);
    } else {
      console.warn(`File not found for rename: ${oldPath}`);
    }
  }
}

// Format the photo date as YYYYMMDD-HHMMSS
function formatPhotoDate(dateObj) {
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");
  const HH = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

// Helper function to get nested properties safely
function getNestedProperty(obj, propertyPath) {
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}
