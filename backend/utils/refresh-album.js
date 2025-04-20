// backend/utils/refresh-album.js
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

  const venvDir = path.join(__dirname, "..", "venv");
  const pythonPath = path.join(venvDir, "bin", "python3");
  const exportScript = path.join(
    __dirname,
    "..",
    "scripts",
    "export_photos_in_album.py"
  );
  const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

  await fs.ensureDir(albumDir);
  await fs.ensureDir(imagesDir);

  // ---------- previous sync metadata ----------
  let lastSyncEpoch = 0;
  let prevScoreHash = null;
  if (await fs.pathExists(photosPath)) {
    const prev = await fs.readJson(photosPath);
    if (Array.isArray(prev) && prev.length) {
      lastSyncEpoch = Math.max(...prev.map((p) => Date.parse(p.date) / 1000));
      prevScoreHash = calcScoreHash(prev);
    }
  }

  // ---------- metadata export ----------
  await runPythonScript(pythonPath, exportScript, [albumUUID], photosPath);

  // ---------- image export (incremental) ----------
  await runOsxphotosExportImages(
    osxphotosPath,
    albumUUID,
    imagesDir,
    photosPath,
    lastSyncEpoch
  );

  const current = await fs.readJson(photosPath);
  const currentScoreHash = calcScoreHash(current);

  // Determine updated photo UUIDs
  const updatedPhotoUUIDs = current
    .filter((p) => Date.parse(p.date) / 1000 > lastSyncEpoch)
    .map((p) => p.uuid);

  return {
    updatedPhotoUUIDs,
    staleScores: prevScoreHash !== currentScoreHash,
  };
}

function calcScoreHash(photos) {
  const h = crypto.createHash("md5");
  photos.forEach((p) => h.update(`${p.uuid}:${p.score?.overall ?? ""}`));
  return h.digest("hex");
}
