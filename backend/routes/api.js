// backend/routes/api.js

import express from "express";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import {
  getAlbumImagesDir,
  getExportBase,
  getLibraryRoot,
} from "../config/storage-paths.js";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
  prepareAlbumForExport,
  exportTopN,
  exportAll,
  getAlbumExportStatus,
} from "../controllers/api/index.js";
import {
  getPeopleInAlbum,
  getPhotosByPerson,
  getLibraryPeople,
} from "../controllers/api/people-controller.js";
import { ensureAlbumPrepared } from "../utils/prepare-album.js";

import { getPeopleByFilename } from "../controllers/api/filename-controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRouter = express.Router();

// ======================
//   Existing Endpoints
// ======================

// Albums
apiRouter.get("/albums", getAlbumsData);
apiRouter.get("/albums/:albumUUID", getAlbumById);
apiRouter.get("/albums/:albumUUID/photos", getPhotosByAlbumData);
apiRouter.get("/albums/:albumUUID/status", getAlbumExportStatus);
apiRouter.post("/albums/:albumUUID/prepare", prepareAlbumForExport);

// People
apiRouter.get("/albums/:albumUUID/persons", getPeopleInAlbum);
apiRouter.get("/albums/:albumUUID/person/:personName", getPhotosByPerson);
apiRouter.get("/photos/by-filename/:filename/persons", getPeopleByFilename);
apiRouter.get("/library/people", getLibraryPeople);

// People-by-filename route for exported filenames
apiRouter.get("/people/by-filename/:filename", getPeopleByFilename);


// ======================
//   Export Endpoints
// ======================
apiRouter.post("/albums/:albumUUID/export-top-n", exportTopN);
apiRouter.post("/albums/:albumUUID/export-all", exportAll);

// ======================
//   REFRESH Endpoint
// ======================
apiRouter.post("/albums/:albumUUID/refresh", async (req, res) => {
  try {
    const { albumUUID } = req.params;
    const albumDir = path.join(
      __dirname,
      "..",
      "..",
      "data",
      "albums",
      albumUUID,
    );
    const photosPath = path.join(albumDir, "photos.json");
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(albumDir, "images");
    const exportBase = getExportBase(albumUUID);
    const libraryRoot = getLibraryRoot();
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_photos_in_album.py",
    );
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    if (await fs.pathExists(photosPath)) {
      await fs.remove(photosPath);
    }
    if (await fs.pathExists(imagesDir)) {
      await fs.remove(imagesDir);
    }
    if (await fs.pathExists(legacyImagesDir)) {
      await fs.remove(legacyImagesDir);
    }

    await ensureAlbumPrepared({
      albumUUID,
      albumDir,
      photosJSON: photosPath,
      imagesDir,
      legacyImagesDir,
      exportBase,
      libraryRoot,
      python: pythonPath,
      pyExport: scriptPath,
      osxphotos: osxphotosPath,
    });

    return res.json({
      message: `Album ${albumUUID} metadata and images have been refreshed.`,
    });
  } catch (error) {
    console.error("Error in refresh endpoint:", error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
});

// JSON-only 404 for unmatched /api routes
apiRouter.use((req, res) => {
  res.status(404).json({ errors: [{ detail: "Not Found" }] });
});

export default apiRouter;
