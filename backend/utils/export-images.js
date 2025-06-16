// backend/utils/export-images.js
//
// Responsibility: run osxphotos to render JPEGs — nothing more.
// The filename template embeds micro-second precision, guaranteeing
// uniqueness and strictly chronological lexicographic order.

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Export JPEGs from an album:
 *
 *   YYYYMMDD-HHMMSSffffff-original_name.jpg
 *
 * …where “ffffff” is the six-digit micro-second field (%f).
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // 1 collect UUIDs (one per line) for osxphotos’ --uuid-from-file
  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.ensureDir(imagesDir);
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf8");

  // 2 run osxphotos
  const filenameTemplate = "{created.strftime,%Y%m%d-%H%M%S%f}-{original_name}";

  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filename "${filenameTemplate}" \
--convert-to-jpeg --jpeg-ext jpg`;

  await execCommand(cmd, "osxphotos image export failed:");
}

/* ---------- small util re-exported elsewhere ----------- */
export function getNestedProperty(obj, pathStr) {
  return pathStr
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}
