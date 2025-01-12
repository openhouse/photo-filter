// backend/routes/api.js

import express from "express";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
} from "../controllers/api/index.js";
import {
  getPeopleInAlbum,
  getPhotosByPerson,
} from "../controllers/api/people-controller.js";
import { runPythonScript } from "../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../utils/export-images.js";

// If needed for resolving paths in a Node ES Module:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRouter = express.Router();

// =====================================
//   Existing Endpoints
// =====================================

// Fetch all albums
apiRouter.get("/albums", getAlbumsData);

// Fetch a single album by UUID
apiRouter.get("/albums/:albumUUID", getAlbumById);

// Fetch photos for a given album
apiRouter.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

// People in an album
apiRouter.get("/albums/:albumUUID/persons", getPeopleInAlbum);

// Photos of a specific person in an album
apiRouter.get("/albums/:albumUUID/person/:personName", getPhotosByPerson);

// =====================================
//   New REFRESH Endpoint
// =====================================
apiRouter.post("/albums/:albumUUID/refresh", async (req, res) => {
  try {
    const { albumUUID } = req.params;

    // Paths
    const dataDir = path.join(
      __dirname,
      "..",
      "..",
      "data",
      "albums",
      albumUUID
    );
    const photosPath = path.join(dataDir, "photos.json");
    const imagesDir = path.join(dataDir, "images");
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

    // Remove existing data to force a re-export
    if (await fs.pathExists(photosPath)) {
      await fs.remove(photosPath);
    }
    if (await fs.pathExists(imagesDir)) {
      await fs.remove(imagesDir);
    }

    // Re-run Python script to get fresh metadata
    await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
    // Then export images again
    await runOsxphotosExportImages(
      osxphotosPath,
      albumUUID,
      imagesDir,
      photosPath
    );

    return res.json({
      message: `Album ${albumUUID} metadata and images have been refreshed.`,
    });
  } catch (error) {
    console.error("Error in refresh endpoint:", error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
});

export default apiRouter;
