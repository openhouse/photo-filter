import path from "path";
import fs from "fs-extra";
import {
  getLibraryPathForExportedName,
  getLibraryRoot,
} from "../config/storage-paths.js";
import { resolveLibraryCandidate } from "./library-files.js";
import { cloneFile } from "./clone-file.js";

const manifestCache = new Map();

export async function ensureAlbumImageMaterialized({
  albumUUID,
  exportedName,
  imagesDir,
  logger = console,
}) {
  if (!exportedName) {
    return null;
  }

  const destination = path.join(imagesDir, exportedName);
  if (await fs.pathExists(destination)) {
    return { path: destination, method: "exists" };
  }

  const manifest = await loadManifest(imagesDir);
  let libraryPath = null;
  const manifestEntry = manifest?.[exportedName];
  if (manifestEntry) {
    libraryPath = path.join(getLibraryRoot(), manifestEntry);
  }
  if (!libraryPath) {
    libraryPath = getLibraryPathForExportedName(exportedName);
  }
  if (!libraryPath) {
    logger.warn?.("materialize-image: no library path", {
      albumUUID,
      exportedName,
    });
    return null;
  }

  const resolved = await resolveLibraryCandidate(libraryPath, exportedName);
  if (!resolved) {
    logger.warn?.("materialize-image: library source missing", {
      albumUUID,
      exportedName,
      libraryPath,
    });
    return null;
  }

  const method = await cloneFile(resolved, destination, {
    logger,
    skipIfExists: true,
  });

  return { path: destination, method };
}

async function loadManifest(imagesDir) {
  const manifestPath = path.join(imagesDir, "manifest.json");
  let stats;
  try {
    stats = await fs.stat(manifestPath);
  } catch {
    manifestCache.delete(manifestPath);
    return null;
  }

  const cached = manifestCache.get(manifestPath);
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return cached.data;
  }

  try {
    const data = await fs.readJson(manifestPath);
    manifestCache.set(manifestPath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      data,
    });
    return data;
  } catch {
    manifestCache.delete(manifestPath);
    return null;
  }
}
