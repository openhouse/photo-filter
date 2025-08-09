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
  getAllPeople,
  getPhotosByPersonLibrary,
} from "../controllers/api/people-controller.js";
import { runPythonScript } from "../utils/run-python-script.js";
import { getPhotosLibraryLastModified } from "../utils/get-photos-library-last-modified.js";

// === Import our new time controller
import { getTimeIndex } from "../controllers/api/time-controller.js";
import { getPeopleByFilename } from "../controllers/api/filename-controller.js";
import { addClient } from "../utils/sse.js";

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
apiRouter.get("/people", getAllPeople);
apiRouter.get("/person/:personName", getPhotosByPersonLibrary);

// Status endpoint
apiRouter.get("/status", async (_req, res) => {
  try {
    const libMtime = await getPhotosLibraryLastModified().catch(() => null);
    const metaPath = path.join(
      __dirname,
      "..",
      "data",
      "library",
      "index-meta.json"
    );
    let indexGeneratedAt = null;
    if (await fs.pathExists(metaPath)) {
      const meta = await fs.readJson(metaPath);
      indexGeneratedAt = meta.generatedAt || null;
    }
    res.json({
      node: process.version,
      osxphotosSpec: process.env.OSXPHOTOS_SPEC || "default-fork",
      photosLibraryMtime: libMtime?.toISOString?.() ?? null,
      indexGeneratedAt,
    });
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// ======================
//   TIME-INDEX ENDPOINT
// ======================
apiRouter.get("/time-index", getTimeIndex);

// ======================
//   SSE STREAM (optional)
// ======================
apiRouter.get("/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(":ok\n\n");
  const remove = addClient(res);
  req.on("close", remove);
});

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
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_photos_in_album.py"
    );

    if (await fs.pathExists(photosPath)) {
      await fs.remove(photosPath);
    }

    // Re-run python script
    await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);

    return res.json({
      message: `Album ${albumUUID} metadata has been refreshed.`,
    });
  } catch (error) {
    console.error("Error in refresh endpoint:", error);
    res.status(500).json({ errors: [{ detail: error.message }] });
  }
});

export default apiRouter;
