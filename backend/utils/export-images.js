// backend/utils/export-images.js
//
// Export JPEGs from an album with **UTC‑based, micro‑second‑precise** names:
//
//     20250531T174503000123Z‑DSCF7309.jpg
//
// ‑ UTC eliminates cross‑camera drift
// ‑ Micro‑seconds guarantee uniqueness
// ‑ The prefix sorts lexicographically == chronologically
//
// Requires Jamie’s fork of osxphotos (branch
// `codex/implement-utc-and-local-postfix-for-template-datetime`), which adds
// the “.utc” secondary field to every datetime template variable:
//        {created.utc.strftime,%Y%m%dT%H%M%S%fZ}

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Export JPEGs for the given album.
 *
 * @param {string} osxphotosPath absolute path to the `osxphotos` binary
 * @param {string} albumUUID     Photos album UUID
 * @param {string} imagesDir     destination directory
 * @param {string} photosPath    path to the album’s photos.json
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // ------------------------------------------------------------------
  // 1 · Write the list of UUIDs that belong to this album
  // ------------------------------------------------------------------
  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");

  await fs.ensureDir(imagesDir);
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf8");

  // ------------------------------------------------------------------
  // 2 · Export the actual images
  // ------------------------------------------------------------------
  const filenameTemplate =
    "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}";

  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
  --uuid-from-file "${uuidsFile}" \
  --download-missing \
  --filename "${filenameTemplate}" \
  --convert-to-jpeg --jpeg-ext jpg`;

  await execCommand(cmd, "osxphotos image export failed:");
}
