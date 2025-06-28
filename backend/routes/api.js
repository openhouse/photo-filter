// backend/routes/api.js

import express from "express";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
  exportTopN,
} from "../controllers/api/index.js";
import {
  getPeopleInAlbum,
  getPhotosByPerson,
} from "../controllers/api/people-controller.js";
import { runPythonScript } from "../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../utils/export-images.js";

// === Import our new time controller
import { getTimeIndex } from "../controllers/api/time-controller.js";
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

// People
apiRouter.get("/albums/:albumUUID/persons", getPeopleInAlbum);
apiRouter.get("/albums/:albumUUID/person/:personName", getPhotosByPerson);
apiRouter.get("/photos/by-filename/:filename/persons", getPeopleByFilename);

// ======================
//   TIME-INDEX ENDPOINT
// ======================
apiRouter.get("/time-index", getTimeIndex);

// ======================
//   Export Top‑N Endpoint
// ======================
apiRouter.post("/albums/:albumUUID/export-top-n", exportTopN);

// ======================
//   REFRESH Endpoint
// ======================
apiRouter.post("/albums/:albumUUID/refresh", async (req, res) => {
  try {
    const { albumUUID } = req.params;
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

    if (await fs.pathExists(photosPath)) {
      await fs.remove(photosPath);
    }
    if (await fs.pathExists(imagesDir)) {
      await fs.remove(imagesDir);
    }

    // Re-run python script
    await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
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
