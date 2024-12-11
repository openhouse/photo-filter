// backend/controllers/api/photos-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { Serializer } from "jsonapi-serializer";
import {
  runOsxphotosExportImages,
  renameExportedImages,
  getNestedProperty,
} from "../../utils/export-images.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PhotoSerializer = new Serializer("photo", {
  id: "uuid",
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
      type: "album",
    },
  },
  pluralizeType: false,
});

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
      // Export photos metadata
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      // Export images
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
      // Rename exported images with date-based filenames
      await renameExportedImages(imagesDir, photosPath);
    }

    const photosData = await fs.readJson(photosPath);

    // Add 'originalName'
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
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
