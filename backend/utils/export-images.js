// backend/utils/export-images.js
//
// Export JPEGs from an album with a **micro‑second UTC** prefix:
//
//     20250531T174503000123Z‑DSCF7309.jpg
//
// Implementation notes
// --------------------
// • osxphotos ≤ 0.72.x lacks a built‑in “|utc” filter.
//   We ship our own Python helper (`to_utc`) and register it via
//   --filter "to_utc:backend.utils.osxphotos_filters:to_utc".
// • We extend PYTHONPATH at runtime so the module is import‑resolvable.
// • The prefix sorts lexicographically == chronologically == across time‑zones.

import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { execCommand } from "./exec-command.js";

const backendRoot = path.join(__dirname, "..");

/**
 * Export JPEGs from an album.
 *
 * @param {string} osxphotosPath  Absolute path to the `osxphotos` binary.
 * @param {string} albumUUID      Photos album UUID.
 * @param {string} imagesDir      Destination directory.
 * @param {string} photosPath     Path to the album’s photos.json.
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // 1.  Gather the UUIDs that should be exported
  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.ensureDir(imagesDir);
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf8");

  // 2.  Filename template that pipes the capture date through our custom filter
  const filenameTemplate =
    '{created|to_utc.strftime,"%Y%m%dT%H%M%S%fZ"}-{original_name}';

  // 3.  Build command.  We prepend PYTHONPATH so osxphotos can import the filter.
  const pythonPathEnv = process.env.PYTHONPATH
    ? `${backendRoot}:${process.env.PYTHONPATH}`
    : backendRoot;

  const cmd =
    `PYTHONPATH="${pythonPathEnv}" ` +
    `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filter "to_utc:backend.utils.osxphotos_filters:to_utc" \
--filename '${filenameTemplate}' \
--convert-to-jpeg --jpeg-ext jpg`;

  await execCommand(cmd, "osxphotos image export failed:");
}
