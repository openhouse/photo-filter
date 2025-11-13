import fs from "fs-extra";
import path from "path";
import { getAlbumImagesDir } from "../config/storage-paths.js";
import { findExportedImageMatch } from "../utils/match-exported-image.js";
import { ensureAlbumImageMaterialized } from "../utils/materialize-album-image.js";

function isSafeAlbum(albumUUID) {
  return /^[A-Za-z0-9_-]+$/.test(albumUUID);
}

function isTraversalAttempt(root, candidate) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && (relative.startsWith("..") || path.isAbsolute(relative));
}

export function createImagesMiddleware({
  fsClient = fs,
  getImagesDir = getAlbumImagesDir,
  materializeImage = ensureAlbumImageMaterialized,
  logger = console,
} = {}) {
  return async function imagesMiddleware(req, res) {
    const { albumUUID, imageName } = req.params;

    if (!isSafeAlbum(albumUUID)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    if (!imageName) {
      return res.status(400).json({ error: "Invalid path" });
    }

    const imagesDir = path.resolve(getImagesDir(albumUUID));
    const requestedName = imageName;
    const candidatePath = path.resolve(imagesDir, requestedName);

    if (isTraversalAttempt(imagesDir, candidatePath)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    try {
      const exists = await fsClient.pathExists(candidatePath);
      if (exists) {
        await applyCachingHeaders(res, fsClient, candidatePath);
        return res.sendFile(candidatePath, { cacheControl: false });
      }

      const materialized = await materializeImage({
        albumUUID,
        exportedName: requestedName,
        imagesDir,
        logger,
      });
      if (materialized?.path) {
        await applyCachingHeaders(res, fsClient, materialized.path);
        return res.sendFile(materialized.path, { cacheControl: false });
      }

      const dirExists = await fsClient.pathExists(imagesDir);
      if (!dirExists) {
        logger.warn?.("images: missing album directory", { albumUUID });
        return res.status(404).json({ error: "Image not found" });
      }

      const files = await fsClient.readdir(imagesDir);
      const fallback = findExportedImageMatch(files, requestedName);
      if (fallback) {
        const fallbackPath = path.resolve(imagesDir, fallback);
        if (!isTraversalAttempt(imagesDir, fallbackPath)) {
          logger.info?.("images: using fallback filename match", {
            albumUUID,
            requested: requestedName,
            resolved: fallback,
          });
          await applyCachingHeaders(res, fsClient, fallbackPath);
          return res.sendFile(fallbackPath, { cacheControl: false });
        }
      }

      logger.warn?.("images: not found", { albumUUID, requestedName });
      return res.status(404).json({ error: "Image not found" });
    } catch (err) {
      logger.error?.("images: unexpected error", {
        albumUUID,
        requestedName,
        err,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

export default createImagesMiddleware;

async function applyCachingHeaders(res, fsClient, filePath) {
  let stats;
  try {
    stats = await fsClient.stat(filePath);
  } catch (err) {
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  const etag = `"${stats.size}-${Math.floor(stats.mtimeMs)}"`;
  res.set("ETag", etag);
}
