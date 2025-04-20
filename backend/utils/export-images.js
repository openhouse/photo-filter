// backend/utils/export-images.js
import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Incremental osxphotos export.
 * If lastSyncEpoch > 0, we add --modified-since to copy only deltas.
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath,
  lastSyncEpoch = 0
) {
  // Collect UUIDs
  const photosData = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.ensureDir(imagesDir);
  await fs.writeFile(
    uuidsFile,
    photosData.map((p) => p.uuid).join("\n"),
    "utf-8"
  );

  const modifiedFlag =
    lastSyncEpoch > 0 ? `--modified-since ${Math.floor(lastSyncEpoch)}` : "";

  // Template keeps stable filenames; --update copies only new/changed files
  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filename "{created.strftime,%Y%m%d-%H%M%S}-{original_name}" \
--convert-to-jpeg --jpeg-ext jpg --update ${modifiedFlag}`;

  await execCommand(cmd, "Error exporting images:");
}
