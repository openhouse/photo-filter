// backend/utils/prepare-album.js

import fs from "fs-extra";
import path from "path";
import { runPythonScript } from "./run-python-script.js";
import { runOsxphotosExportImages } from "./export-images.js";
import { loadStatus, writeStatus, clearStatus } from "./export-status.js";

const inFlight = new Map();

async function ensureLegacySymlink(imagesDir, legacyImagesDir) {
  try {
    await fs.ensureDir(path.dirname(legacyImagesDir));
    const st = await fs.lstat(legacyImagesDir).catch(() => null);
    if (!st) {
      await fs.ensureSymlink(imagesDir, legacyImagesDir, "dir");
    }
  } catch (e) {
    console.warn("Could not create legacy images symlink:", {
      legacyImagesDir,
      imagesDir,
      e,
    });
  }
}

async function prepareAlbumInternal(context) {
  const {
    albumUUID,
    albumDir,
    photosJSON,
    imagesDir,
    legacyImagesDir,
    exportBase,
    python,
    pyExport,
    osxphotos,
  } = context;

  await fs.ensureDir(albumDir);
  await fs.ensureDir(imagesDir);
  await ensureLegacySymlink(imagesDir, legacyImagesDir);

  const status = await loadStatus(albumUUID, { exportBase, photosJSON });
  const hasPhotos = await fs.pathExists(photosJSON);

  if (hasPhotos && status.status === "ready") {
    return status;
  }

  if (hasPhotos && status.status !== "ready") {
    return await writeStatus(albumUUID, exportBase, {
      status: "ready",
      finishedAt: status.finishedAt || new Date().toISOString(),
    });
  }

  const startedAt = new Date().toISOString();
  const runningStatus = await writeStatus(albumUUID, exportBase, {
    status: "running",
    startedAt,
    finishedAt: null,
    errorMessage: null,
    logPath: path.join(exportBase, "logs", `export-${albumUUID}.log`),
  });

  try {
    const { logPath } = await runPythonScript(
      python,
      pyExport,
      [albumUUID],
      photosJSON,
      {
        albumUUID,
        exportBase,
        logPath: runningStatus.logPath,
      },
    );
    await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, photosJSON);
    return await writeStatus(albumUUID, exportBase, {
      status: "ready",
      finishedAt: new Date().toISOString(),
      errorMessage: null,
      logPath: logPath || runningStatus.logPath,
    });
  } catch (err) {
    await writeStatus(albumUUID, exportBase, {
      status: "error",
      finishedAt: new Date().toISOString(),
      errorMessage: err.message,
    });
    throw err;
  }
}

export function ensureAlbumPrepared(context) {
  const { albumUUID } = context;
  if (inFlight.has(albumUUID)) {
    return inFlight.get(albumUUID);
  }
  const promise = prepareAlbumInternal(context)
    .catch((err) => {
      // On failure, clear cache so next attempt can retry fresh
      clearStatus(albumUUID);
      throw err;
    })
    .finally(() => {
      inFlight.delete(albumUUID);
    });
  inFlight.set(albumUUID, promise);
  return promise;
}
