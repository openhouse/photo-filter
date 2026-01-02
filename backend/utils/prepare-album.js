// backend/utils/prepare-album.js

import fs from "fs-extra";
import path from "path";
import pLimit from "p-limit";
import { runPythonScript } from "./run-python-script.js";
import {
  loadUuidsFromFile,
  runOsxphotosExportImages,
} from "./export-images.js";
import {
  loadStatus,
  writeStatus,
  clearStatus,
  recordHeartbeat,
} from "./export-status.js";
import { ensureLegacySymlink } from "./symlinks.js";
import {
  getLibraryPathForExportedName,
  getLibraryRoot,
} from "../config/storage-paths.js";
import { buildExportedFilename } from "./exported-filename.js";
import { cloneFile } from "./clone-file.js";
import { getCloneConcurrency } from "../config/concurrency.js";
import { resolveLibraryCandidate } from "./library-files.js";

const CLONE_CONCURRENCY = getCloneConcurrency();

const inFlight = new Map();

async function prepareAlbumInternal(context) {
  const {
    albumUUID,
    albumDir,
    photosJSON,
    imagesDir,
    legacyImagesDir,
    exportBase,
    libraryRoot = getLibraryRoot(),
    python,
    pyExport,
    osxphotos,
  } = context;

  const uuidsFile = path.join(imagesDir, "uuids.txt");

  await fs.ensureDir(albumDir);
  await fs.ensureDir(imagesDir);
  await fs.ensureDir(libraryRoot);
  await ensureLegacySymlink(imagesDir, legacyImagesDir, { logger: console });

  const status = await loadStatus(albumUUID, { exportBase, photosJSON });
  const hasPhotos = await fs.pathExists(photosJSON);

  if (hasPhotos) {
    if (status.status === "ready" || status.status === "skipped-empty") {
      return status;
    }
    if (status.status && status.status !== "error") {
      return await writeStatus(albumUUID, exportBase, {
        status: "ready",
        finishedAt: status.finishedAt || new Date().toISOString(),
      });
    }
  }

  const startedAt = new Date().toISOString();
  const runningStatus = await writeStatus(albumUUID, exportBase, {
    status: "running",
    startedAt,
    finishedAt: null,
    errorMessage: null,
    logPath: path.join(exportBase, "logs", `export-${albumUUID}.log`),
    lastHeartbeatAt: startedAt,
  });

  await fs.ensureDir(path.dirname(runningStatus.logPath));
  const logStream = fs.createWriteStream(runningStatus.logPath, { flags: "a" });
  const stopHeartbeat = startStatusHeartbeat(albumUUID, exportBase);

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

    try {
      await fs.remove(uuidsFile);
    } catch (err) {
      logMessage(
        `WARN: ${albumUUID} failed to remove uuids file ${uuidsFile}: ${err.message}`,
      );
      console.warn(`[prepare-album] ${albumUUID} remove uuids failed`, {
        path: uuidsFile,
        code: err?.code,
        errno: err?.errno,
        message: err?.message,
      });
    }

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
    const progressTimestamp = new Date().toISOString();
    await recordHeartbeat(albumUUID, exportBase, {
      lastProgressAt: progressTimestamp,
      lastHeartbeatAt: progressTimestamp,
    });
    const { size: photosSize } = await fs.stat(photosJSON);
    if (photosSize > 512 * 1024 * 1024) {
      const message = `photos.json too large to process (${formatBytes(photosSize)})`;
      logMessage(message);
      throw new Error(message);
    }
    const photos = await fs.readJson(photosJSON);
    const uuids = await loadUuidsFromFile(uuidsFile);
    let exportResult = null;

    if (uuids.length === 0 || photos.length === 0) {
      const message = `Album ${albumUUID} empty; skipping osxphotos export`;
      logMessage(message);
      console.log(`[prepare-album] ${message}`);
      await fs.ensureFile(path.join(imagesDir, ".skipped-empty"));
      const skippedTimestamp = new Date().toISOString();
      await recordHeartbeat(albumUUID, exportBase, {
        lastProgressAt: skippedTimestamp,
        lastHeartbeatAt: skippedTimestamp,
      });
      try {
        await fs.remove(path.join(libraryRoot, ".skipped-empty"));
      } catch (err) {
        logMessage(
          `WARN: ${albumUUID} failed to clear library empty marker: ${err.message}`,
        );
        console.warn(`[prepare-album] ${albumUUID} clear library marker failed`, {
          code: err?.code,
          errno: err?.errno,
          message: err?.message,
        });
      }
    } else {
      try {
        await fs.remove(path.join(imagesDir, ".skipped-empty"));
      } catch (err) {
        logMessage(
          `WARN: ${albumUUID} failed to clear skipped marker: ${err.message}`,
        );
        console.warn(`[prepare-album] ${albumUUID} clear skipped marker failed`, {
          code: err?.code,
          errno: err?.errno,
          message: err?.message,
        });
      }
      logMessage(`Starting library export for album ${albumUUID}`);
      exportResult = await runOsxphotosExportImages(
        osxphotos,
        albumUUID,
        libraryRoot,
        uuidsFile,
        {
          logStream,
        },
      );
      if (exportResult?.skippedReason === "empty-album") {
        logMessage(`Album ${albumUUID} empty; skipping osxphotos export`);
        await fs.ensureFile(path.join(imagesDir, ".skipped-empty"));
        const emptyTimestamp = new Date().toISOString();
        await recordHeartbeat(albumUUID, exportBase, {
          lastProgressAt: emptyTimestamp,
          lastHeartbeatAt: emptyTimestamp,
        });
      } else {
        logMessage(`Finished library export for album ${albumUUID}`);
        const materialization = await syncAlbumImagesFromLibrary({
          albumUUID,
          photos,
          imagesDir,
          libraryRoot,
          logger: {
            info: (message, extra) =>
              logMessage(`${message} ${formatExtra(extra)}`),
            warn: (message, extra) =>
              logMessage(`WARN: ${message} ${formatExtra(extra)}`),
          },
        });
        if (materialization) {
          logMessage(
            `[prepare-album] ${albumUUID} materialization ${formatExtra(materialization)}`,
          );
          const materializedAt = new Date().toISOString();
          await recordHeartbeat(albumUUID, exportBase, {
            materialization,
            lastMaterializedAt: materializedAt,
            lastProgressAt: materializedAt,
            lastHeartbeatAt: materializedAt,
          });
        }
      }
    }
    const completionTime = new Date().toISOString();
    const isEmptyExport =
      uuids.length === 0 ||
      photos.length === 0 ||
      exportResult?.skippedReason === "empty-album";
    const finalStatus = isEmptyExport ? "skipped-empty" : "ready";
    return await writeStatus(albumUUID, exportBase, {
      status: finalStatus,
      finishedAt: completionTime,
      errorMessage: null,
      logPath: logPath || runningStatus.logPath,
      exportedCount: exportResult?.exported ?? 0,
      lastProgressAt: completionTime,
      lastHeartbeatAt: completionTime,
    });
  } catch (err) {
    logMessage(`Export failed for album ${albumUUID}: ${err.message}`);
    const failureTime = new Date().toISOString();
    await writeStatus(albumUUID, exportBase, {
      status: "error",
      finishedAt: failureTime,
      errorMessage: err.message,
      logPath: runningStatus.logPath,
      lastProgressAt: failureTime,
      lastHeartbeatAt: failureTime,
    });
    await closeLogStream().catch((err) => {
      console.warn(`[prepare-album] ${albumUUID} failed to close log stream`, {
        message: err?.message,
      });
    });
    throw err;
  }
  finally {
    await closeLogStream().catch((err) => {
      console.warn(`[prepare-album] ${albumUUID} failed to close log stream`, {
        message: err?.message,
      });
    });
    await stopHeartbeat().catch((err) => {
      console.warn(`[prepare-album] ${albumUUID} failed to stop heartbeat`, {
        message: err?.message,
      });
    });
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

function formatExtra(extra) {
  if (!extra) return "";
  try {
    return JSON.stringify(extra);
  } catch {
    return String(extra);
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return String(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted =
    value >= 10 || value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function startStatusHeartbeat(albumUUID, exportBase, intervalMs = 15000) {
  let stopped = false;
  let running = false;

  const tick = async () => {
    if (stopped || running) {
      return;
    }
    running = true;
    try {
      await recordHeartbeat(albumUUID, exportBase);
    } catch (err) {
      console.warn(`[prepare-album] ${albumUUID} heartbeat update failed`, {
        message: err?.message,
      });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer?.unref?.();

  void tick();

  return async () => {
    stopped = true;
    clearInterval(timer);
    while (running) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
}

async function syncAlbumImagesFromLibrary({
  albumUUID,
  photos,
  imagesDir,
  libraryRoot = getLibraryRoot(),
  logger = console,
}) {
  const expected = new Map();
  for (const photo of photos) {
    const exported = buildExportedFilename(photo);
    if (!exported) continue;
    expected.set(exported, getLibraryPathForExportedName(exported));
  }

  const keepNames = new Set(["uuids.txt"]);
  const counters = { clone: 0, link: 0, copy: 0, missing: 0, errors: 0 };
  const limit = pLimit(CLONE_CONCURRENCY);
  const tasks = [];
  const manifestEntries = new Map();

  for (const [exportedName, libraryPath] of expected) {
    keepNames.add(exportedName);
    const relative = path.relative(libraryRoot, libraryPath);
    const manifestValue = relative ? toPosix(relative) : exportedName;
    manifestEntries.set(exportedName, manifestValue);
    tasks.push(
      limit(async () => {
        try {
          const resolved = await resolveLibraryCandidate(
            libraryPath,
            exportedName,
          );
          if (!resolved) {
            counters.missing += 1;
            logger.warn?.("Library image missing", {
              albumUUID,
              exportedName,
              libraryPath,
            });
            return;
          }

          const method = await cloneFile(
            resolved,
            path.join(imagesDir, exportedName),
            {
              logger,
              skipIfExists: true,
            },
          );
          if (typeof counters[method] === "number") {
            counters[method] += 1;
          }
        } catch (err) {
          counters.errors += 1;
          logger.warn?.("Failed to materialize image", {
            albumUUID,
            exportedName,
            error: err?.message,
            code: err?.code,
          });
        }
      }),
    );
  }

  await Promise.all(tasks);

  await writeManifest(imagesDir, manifestEntries, logger, albumUUID);

  let existing = [];
  try {
    existing = await fs.readdir(imagesDir);
  } catch (err) {
    logger.warn?.("Failed to list album images", {
      albumUUID,
      imagesDir,
      error: err?.message,
    });
  }

  for (const name of existing) {
    if (keepNames.has(name)) continue;
    if (name === ".skipped-empty") continue;
    if (name === "manifest.json") continue;
    if (!/\.jpe?g$/i.test(name)) continue;
    const target = path.join(imagesDir, name);
    try {
      await fs.remove(target);
    } catch (err) {
      logger.warn?.("Failed to remove stale image", {
        albumUUID,
        path: target,
        error: err?.message,
      });
    }
  }

  return counters;
}

async function writeManifest(imagesDir, manifestEntries, logger, albumUUID) {
  const manifestPath = path.join(imagesDir, "manifest.json");
  if (!manifestEntries || manifestEntries.size === 0) {
    await fs.remove(manifestPath).catch(() => {});
    return;
  }

  const ordered = {};
  for (const name of Array.from(manifestEntries.keys()).sort()) {
    ordered[name] = manifestEntries.get(name);
  }

  try {
    await fs.writeJson(manifestPath, ordered, { spaces: 2 });
    logger.info?.("prepare-album: wrote manifest", {
      albumUUID,
      manifestPath,
      entries: manifestEntries.size,
    });
  } catch (err) {
    logger.warn?.("prepare-album: failed to write manifest", {
      albumUUID,
      manifestPath,
      error: err?.message,
    });
  }
}

function toPosix(value) {
  if (!value) return value;
  return value.split(path.sep).join(path.posix.sep);
}
