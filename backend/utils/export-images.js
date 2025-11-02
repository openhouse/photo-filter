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
 * @param {string} uuidsFile     path to the album’s uuid list file
 * @param {{ logStream?: import("stream").Writable }} [options]
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  uuidsFile,
  options = {}
) {
  const resolvedUuidsFile = uuidsFile || path.join(imagesDir, "uuids.txt");

  await fs.ensureDir(imagesDir);
  if (!(await fs.pathExists(resolvedUuidsFile))) {
    throw new Error(
      `UUID list not found for album ${albumUUID} at ${resolvedUuidsFile}`
    );
  }

  const filenameTemplate =
    "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}";

  const args = [
    "export",
    imagesDir,
    "--uuid-from-file",
    resolvedUuidsFile,
    "--download-missing",
    "--use-photokit",
    // "--ramdb",
    "--update",
    "--only-photos",
    "--skip-live",
    "--skip-raw",
    "--filename",
    filenameTemplate,
    "--convert-to-jpeg",
    "--jpeg-ext",
    "jpg",
  ];

  if (
    options.logStream &&
    !options.logStream.destroyed &&
    !options.logStream.writableEnded
  ) {
    options.logStream.write(
      `[${new Date().toISOString()}] Running osxphotos export for ${albumUUID}\n`
    );
  }

  await execCommand(
    [osxphotosPath, ...args],
    "osxphotos image export failed:",
    options
  );
}
