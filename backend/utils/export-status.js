// backend/utils/export-status.js

import fs from "fs-extra";
import path from "path";

const statusCache = new Map();

function statusPath(exportBase) {
  return path.join(exportBase, "status.json");
}

function mergeStatus(previous = {}, updates = {}) {
  const next = { ...previous };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    next[key] = value;
  }
  return next;
}

export async function loadStatus(albumUUID, { exportBase, photosJSON }) {
  const cached = statusCache.get(albumUUID);
  if (cached) {
    return cached;
  }

  let status = { status: "pending" };
  const statusFile = statusPath(exportBase);

  if (await fs.pathExists(statusFile)) {
    try {
      status = await fs.readJson(statusFile);
    } catch (err) {
      console.warn(`Failed to read status for ${albumUUID}:`, err);
    }
  } else if (photosJSON && (await fs.pathExists(photosJSON))) {
    status = {
      status: "ready",
      finishedAt: new Date().toISOString(),
    };
    await writeStatus(albumUUID, exportBase, status);
    return status;
  }

  statusCache.set(albumUUID, status);
  return status;
}

export async function writeStatus(albumUUID, exportBase, updates) {
  const statusFile = statusPath(exportBase);
  await fs.ensureDir(exportBase);
  const current =
    statusCache.get(albumUUID) || (await readStatusFile(statusFile));
  const next = mergeStatus(current, updates);
  statusCache.set(albumUUID, next);
  await fs.writeJson(statusFile, next, { spaces: 2 });
  return next;
}

async function readStatusFile(statusFile) {
  if (await fs.pathExists(statusFile)) {
    try {
      return await fs.readJson(statusFile);
    } catch (err) {
      console.warn(`Failed to read status file ${statusFile}:`, err);
    }
  }
  return { status: "pending" };
}

export function clearStatus(albumUUID) {
  statusCache.delete(albumUUID);
}

export function getCachedStatus(albumUUID) {
  return statusCache.get(albumUUID);
}
