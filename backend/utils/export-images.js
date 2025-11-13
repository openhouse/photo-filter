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
import {
  getLibraryDirTemplate,
  getLibraryExportDbPath,
} from "../config/storage-paths.js";

export async function loadUuidsFromFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw) {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Export JPEGs for the given album.
 *
 * @param {string} osxphotosPath absolute path to the `osxphotos` binary
 * @param {string} albumUUID     Photos album UUID
 * @param {string} destinationDir destination directory
 * @param {string} uuidsFile     path to the album’s uuid list file
 * @param {{ logStream?: import("stream").Writable }} [options]
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  destinationDir,
  uuidsFile,
  options = {}
) {
  const resolvedUuidsFile =
    uuidsFile || path.join(destinationDir, "uuids.txt");

  await fs.ensureDir(destinationDir);
  if (!(await fs.pathExists(resolvedUuidsFile))) {
    throw new Error(
      `UUID list not found for album ${albumUUID} at ${resolvedUuidsFile}`
    );
  }

  const uuids = await loadUuidsFromFile(resolvedUuidsFile);
  const markerPath = path.join(destinationDir, ".skipped-empty");

  const logMessage = (message) => {
    if (
      options.logStream &&
      !options.logStream.destroyed &&
      !options.logStream.writableEnded
    ) {
      options.logStream.write(
        `[${new Date().toISOString()}] ${message}\n`,
      );
    }
  };

  if (uuids.length === 0) {
    const message = `[export-images] ${albumUUID}: empty album; skipping osxphotos export`;
    console.log(message);
    logMessage(message);
    await fs.ensureFile(markerPath);
    return {
      exported: 0,
      skippedReason: "empty-album",
      uuidsCount: 0,
    };
  }

  await fs.remove(markerPath).catch(() => {});

  const filenameTemplate =
    "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}";

  const args = [
    "export",
    destinationDir,
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

  const directoryTemplate =
    options.directoryTemplate || getLibraryDirTemplate();
  if (directoryTemplate) {
    args.push("--directory", directoryTemplate);
  }

  const exportDbPath = options.exportDbPath || getLibraryExportDbPath();
  if (exportDbPath) {
    args.push("--export-db", exportDbPath);
  }

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

  return {
    exported: uuids.length,
    skippedReason: null,
    uuidsCount: uuids.length,
  };
}
