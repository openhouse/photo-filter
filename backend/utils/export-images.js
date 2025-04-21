// backend/utils/export-images.js
//
// Uses osxphotos CLI to copy only *new or modified* images
// since the last sync.  Pictures already present & unchanged are skipped.

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Incremental osxphotos export.
 * @param {string} osxphotosPath  – path to osxphotos CLI inside venv
 * @param {string} albumUUID
 * @param {string} imagesDir
 * @param {string} photosPath     – path to photos.json (already refreshed)
 * @param {number} lastSyncEpoch  – UNIX seconds of previous sync (0 = full)
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath,
  lastSyncEpoch = 0
) {
  /* ---------- prep ---------- */
  await fs.ensureDir(imagesDir);

  // uuid list for osxphotos --uuid-from-file
  const photosData = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.writeFile(
    uuidsFile,
    photosData.map((p) => p.uuid).join("\n"),
    "utf-8"
  );

  /* ---------- flags ---------- */
  const sinceIso =
    lastSyncEpoch > 0 ? new Date(lastSyncEpoch * 1000).toISOString() : null;

  const modifiedFlag = sinceIso ? `--modified-since "${sinceIso}"` : "";
  const updateFlag = "--update";

  /* ---------- command ---------- */
  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filename "{created.strftime,%Y%m%d-%H%M%S}-{original_name}" \
--convert-to-jpeg --jpeg-ext jpg ${updateFlag} ${modifiedFlag}`;

  await execCommand(cmd, "Error exporting images:");
}
