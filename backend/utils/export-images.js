// backend/utils/export-images.js
//
// Export JPEGs from a Photos album.
//
// Rationale (2025‑06‑17)
// ──────────────────────
// The public osxphotos CLI still does **not** ship the
// `--template-filter` option.  We therefore export every photo as
//
//     <uuid>.jpg
//
// and do the UTC‑timestamp renaming in JavaScript immediately after
// the export.  That keeps us compatible with *all* osxphotos versions
// while retaining the deterministic
//
//     20250617T162144123456Z‑DSCF9999.jpg
//
// prefix our pipeline expects.

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Export JPEGs for the UUIDs listed in `photosPath` into `imagesDir`.
 *
 * @param {string} osxphotosPath absolute path to the osxphotos binary
 * @param {string} albumUUID     Photos album UUID (only used for logging)
 * @param {string} imagesDir     Destination directory
 * @param {string} photosPath    Absolute path to the album’s photos.json
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  /* 1 ─ create <imagesDir>/uuids.txt */
  await fs.ensureDir(imagesDir);

  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf8");

  /* 2 ─ build export command */
  const filenameTemplate = "{uuid}"; // guaranteed unique, easy to rename later

  const cmd =
    `"${osxphotosPath}" export "${imagesDir}" ` +
    `--uuid-from-file "${uuidsFile}" ` +
    `--filename '${filenameTemplate}' ` +
    "--convert-to-jpeg --jpeg-ext jpg";

  console.log(`\n[osxphotos] exporting album ${albumUUID} …`);
  await execCommand(cmd, "osxphotos image export failed:");
  console.log("[osxphotos] export complete\n");
}
