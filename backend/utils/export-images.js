// backend/utils/export-images.js
//
// Responsible only for *running osxphotos* — no more post-rename.
// The filename template now embeds micro-seconds directly, so we
// never collide and never lose chronological order.
//

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Export JPEGs with a deterministic, micro-second timestamp prefix:
 *
 *   YYYYMMDD-HHMMSSffffff-original_name.jpg
 *
 * …where “ffffff” is the six-digit micro-seconds field provided by
 * Python’s %f in strftime.
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // Gather UUIDs into a temp file for osxphotos
  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.ensureDir(imagesDir);
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf-8");

  // %f  → micro-seconds  (Python ≥3.6)  – always 6 digits
  const filenameTemplate = "{created.strftime,%Y%m%d-%H%M%S%f}-{original_name}";

  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filename "${filenameTemplate}" \
--convert-to-jpeg --jpeg-ext jpg`;

  await execCommand(cmd, "osxphotos image export failed:");
}

/**
 * Utility surfaced elsewhere
 */
export function getNestedProperty(obj, pathStr) {
  return pathStr
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}
