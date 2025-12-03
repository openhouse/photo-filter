import fs from "fs-extra";
import path from "path";
import {
  getLibraryPathForExportedName,
  getLibraryRoot,
} from "../config/storage-paths.js";
import { resolveLibraryCandidate } from "../utils/library-files.js";
import { applyCachingHeaders } from "./images.js";

function isTraversalAttempt(root, candidate) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && (relative.startsWith("..") || path.isAbsolute(relative));
}

function isSafeBasename(name) {
  if (!name) return false;

  if (name === "." || name === "..") return false;

  const normalized = path.basename(name);
  if (normalized !== name) return false;

  if (name.includes("/") || name.includes("\\")) return false;

  return true;
}

export function createLibraryImagesMiddleware({ fsClient = fs, logger = console } = {}) {
  const libraryRoot = path.resolve(getLibraryRoot());

  return async function libraryImagesMiddleware(req, res) {
    const { exportedName } = req.params;

    if (!isSafeBasename(exportedName)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    const basePath = getLibraryPathForExportedName(exportedName);
    if (!basePath) {
      logger.warn?.("library-images: no basePath", { exportedName });
      return res.status(404).json({ error: "Image not found" });
    }

    const absoluteBase = path.resolve(basePath);
    if (isTraversalAttempt(libraryRoot, absoluteBase)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    try {
      const resolved = await resolveLibraryCandidate(absoluteBase, exportedName);
      if (resolved && !isTraversalAttempt(libraryRoot, resolved)) {
        await applyCachingHeaders(res, fsClient, resolved);
        return res.sendFile(resolved, { cacheControl: false });
      }

      logger.warn?.("library-images: not found", { exportedName });
      return res.status(404).json({ error: "Image not found" });
    } catch (err) {
      logger.error?.("library-images: unexpected error", { exportedName, err });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

export default createLibraryImagesMiddleware;
