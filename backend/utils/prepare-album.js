// backend/utils/prepare-album.js

import fs from "fs-extra";
import path from "path";
import pLimit from "p-limit";
import { runPythonScript } from "./run-python-script.js";
import {
  loadUuidsFromFile,
  runOsxphotosExportImages,
} from "./export-images.js";
import { loadStatus, writeStatus, clearStatus } from "./export-status.js";
import { ensureLegacySymlink } from "./symlinks.js";
import {
  getLibraryPathForExportedName,
  getLibraryRoot,
} from "../config/storage-paths.js";
import { buildExportedFilename } from "./exported-filename.js";
import { cloneFile } from "./clone-file.js";

const CLONE_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.PF_CLONE_CONCURRENCY ?? "8", 10),
);

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
    const photos = await fs.readJson(photosJSON);
    const uuids = await loadUuidsFromFile(uuidsFile);
    let exportResult = null;

    if (uuids.length === 0 || photos.length === 0) {
      const message = `Album ${albumUUID} empty; skipping osxphotos export`;
      logMessage(message);
      console.log(`[prepare-album] ${message}`);
      await fs.ensureFile(path.join(imagesDir, ".skipped-empty"));
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
      } else {
        logMessage(`Finished library export for album ${albumUUID}`);
        const materialization = await syncAlbumImagesFromLibrary({
          albumUUID,
          photos,
          imagesDir,
          logger: {
            info: (message, extra) => logMessage(`${message} ${formatExtra(extra)}`),
            warn: (message, extra) => logMessage(`WARN: ${message} ${formatExtra(extra)}`),
          },
        });
        if (materialization) {
          logMessage(
            `[prepare-album] ${albumUUID} materialization ${formatExtra(materialization)}`,
          );
          await writeStatus(albumUUID, exportBase, {
            materialization,
            lastMaterializedAt: new Date().toISOString(),
          });
        }
      }
    }
    return await writeStatus(albumUUID, exportBase, {
      status: "ready",
      finishedAt: new Date().toISOString(),
      errorMessage: null,
      logPath: logPath || runningStatus.logPath,
      exportedCount: exportResult?.exported ?? 0,
    });
  } catch (err) {
    logMessage(`Export failed for album ${albumUUID}: ${err.message}`);
    await writeStatus(albumUUID, exportBase, {
      status: "error",
      finishedAt: new Date().toISOString(),
      errorMessage: err.message,
      logPath: runningStatus.logPath,
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

async function syncAlbumImagesFromLibrary({
  albumUUID,
  photos,
  imagesDir,
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

  for (const [exportedName, libraryPath] of expected) {
    keepNames.add(exportedName);
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

          const method = await cloneFile(resolved, path.join(imagesDir, exportedName), {
            logger,
          });
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

async function resolveLibraryCandidate(libraryPath, exportedName) {
  if (await fs.pathExists(libraryPath)) {
    return libraryPath;
  }

  const dir = path.dirname(libraryPath);
  const ext = path.extname(exportedName);
  const base = path.basename(exportedName, ext);

  const suffixes = buildCollisionSuffixes();
  for (const suffix of suffixes) {
    const candidate = path.join(dir, `${base}${suffix}${ext}`);
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildCollisionSuffixes() {
  const suffixes = [];
  for (let i = 1; i <= 9; i += 1) {
    suffixes.push(`-${i}`);
    suffixes.push(` (${i})`);
  }
  return suffixes;
}
