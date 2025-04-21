// backend/utils/refresh-album.js
//
// Incrementally refresh a single album.
// Creates *all* needed folders/files on the fly so first‑run never fails.

import path from "path";
import fs from "fs-extra";
import crypto from "crypto";
import { runPythonScript } from "./run-python-script.js";
import { runOsxphotosExportImages } from "./export-images.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Refresh a single album incrementally.
 * Returns { updatedPhotoUUIDs: string[], staleScores: boolean }
 */
export async function refreshAlbumIncremental(albumUUID) {
  const dataDir = path.join(__dirname, "..", "data");
  const albumDir = path.join(dataDir, "albums", albumUUID);
  const photosPath = path.join(albumDir, "photos.json");
  const imagesDir = path.join(albumDir, "images");
  const lastSyncFile = path.join(albumDir, "last_sync.txt");

  /* ---------- guarantee folder structure ---------- */
  await fs.ensureDir(albumDir);
  await fs.ensureDir(imagesDir);

  /* ---------- read last‑sync timestamp ---------- */
  let lastSyncIso = null;
  if (await fs.pathExists(lastSyncFile)) {
    lastSyncIso = (await fs.readFile(lastSyncFile, "utf-8")).trim() || null;
  }

  let lastSyncEpoch = 0;
  if (lastSyncIso) {
    const parsed = Date.parse(lastSyncIso);
    if (!Number.isNaN(parsed)) lastSyncEpoch = Math.floor(parsed / 1000);
  }

  /* ---------- Python metadata export ---------- */
  const venvDir = path.join(__dirname, "..", "venv");
  const pythonPath = path.join(venvDir, "bin", "python3");
  const exportScript = path.join(
    __dirname,
    "..",
    "scripts",
    "export_photos_in_album.py"
  );

  const args = lastSyncIso ? [albumUUID, lastSyncIso] : [albumUUID];
  await runPythonScript(pythonPath, exportScript, args, photosPath);

  /* ---------- images export (incremental) ---------- */
  const osxphotosPath = path.join(venvDir, "bin", "osxphotos");
  await runOsxphotosExportImages(
    osxphotosPath,
    albumUUID,
    imagesDir,
    photosPath,
    lastSyncEpoch
  );

  /* ---------- diff & bookkeeping ---------- */
  const current = await fs.readJson(photosPath);
  const currentScoreHash = calcScoreHash(current);

  const updatedPhotoUUIDs = current
    .filter((p) => Date.parse(p.date) / 1000 > lastSyncEpoch)
    .map((p) => p.uuid);

  // bump last_sync.txt for the next run
  await fs.ensureFile(lastSyncFile);
  await fs.writeFile(lastSyncFile, new Date().toISOString(), "utf-8");

  return {
    updatedPhotoUUIDs,
    staleScores: Boolean(currentScoreHash), // caller decides what to do
  };
}

function calcScoreHash(photos) {
  const h = crypto.createHash("md5");
  photos.forEach((p) => h.update(`${p.uuid}:${p.score?.overall ?? ""}`));
  return h.digest("hex");
}
