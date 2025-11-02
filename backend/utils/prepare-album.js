// backend/utils/prepare-album.js

import fs from "fs-extra";
import path from "path";
import { runPythonScript } from "./run-python-script.js";
import { runOsxphotosExportImages } from "./export-images.js";
import { loadStatus, writeStatus, clearStatus } from "./export-status.js";
import { ensureLegacySymlink } from "./symlinks.js";

const inFlight = new Map();

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

  const uuidsFile = path.join(imagesDir, "uuids.txt");

  await fs.ensureDir(albumDir);
  await fs.ensureDir(imagesDir);
  await ensureLegacySymlink(imagesDir, legacyImagesDir, { logger: console });

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

  await fs.ensureDir(path.dirname(runningStatus.logPath));
  const logStream = fs.createWriteStream(runningStatus.logPath, { flags: "a" });

  const closeLogStream = async () => {
    if (!logStream || logStream.destroyed || logStream.writableEnded) {
      return;
    }
    await new Promise((resolve) => {
      logStream.end(() => resolve());
    });
  };

  const logMessage = (message) => {
    if (!logStream || logStream.destroyed || logStream.writableEnded) {
      return;
    }
    logStream.write(`[${new Date().toISOString()}] ${message}\n`);
  };

  try {
    logMessage(`Starting export for album ${albumUUID}`);

    await fs.remove(uuidsFile).catch(() => {});

    const { logPath } = await runPythonScript(
      python,
      pyExport,
      [albumUUID, uuidsFile],
      photosJSON,
      {
        albumUUID,
        exportBase,
        logPath: runningStatus.logPath,
        logStream,
        appendLog: true,
      },
    );
    logMessage(`Starting osxphotos export for album ${albumUUID}`);

    await runOsxphotosExportImages(
      osxphotos,
      albumUUID,
      imagesDir,
      uuidsFile,
      {
        logStream,
      },
    );
    logMessage(`Finished export for album ${albumUUID}`);
    return await writeStatus(albumUUID, exportBase, {
      status: "ready",
      finishedAt: new Date().toISOString(),
      errorMessage: null,
      logPath: logPath || runningStatus.logPath,
    });
  } catch (err) {
    logMessage(`Export failed for album ${albumUUID}: ${err.message}`);
    await writeStatus(albumUUID, exportBase, {
      status: "error",
      finishedAt: new Date().toISOString(),
      errorMessage: err.message,
      logPath: runningStatus.logPath,
    });
    await closeLogStream().catch(() => {});
    throw err;
  }
  finally {
    await closeLogStream().catch(() => {});
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
