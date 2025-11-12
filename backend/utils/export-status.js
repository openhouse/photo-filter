// backend/utils/export-status.js

import fs from "fs-extra";
import path from "path";

const statusCache = new Map();

function parseMs(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const CACHE_TTL_MS = parseMs(process.env.PF_STATUS_CACHE_TTL_MS, 1000);
const STUCK_RUNNING_THRESHOLD_MS = parseMs(
  process.env.PF_STATUS_STUCK_THRESHOLD_MS,
  45_000,
);
const STUCK_PENDING_THRESHOLD_MS = parseMs(
  process.env.PF_STATUS_PENDING_THRESHOLD_MS,
  30_000,
);
const RETRY_RUNNING_MS = parseMs(
  process.env.PF_STATUS_RUNNING_RETRY_MS,
  2000,
);
const RETRY_PENDING_MS = parseMs(
  process.env.PF_STATUS_PENDING_RETRY_MS,
  1000,
);
const RETRY_STUCK_MS = parseMs(
  process.env.PF_STATUS_STUCK_RETRY_MS,
  5000,
);
const RETRY_DEFAULT_MS = parseMs(
  process.env.PF_STATUS_DEFAULT_RETRY_MS,
  5000,
);

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

function getCached(albumUUID) {
  const entry = statusCache.get(albumUUID);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.loadedAt > CACHE_TTL_MS) {
    statusCache.delete(albumUUID);
    return null;
  }
  return entry.value;
}

function setCached(albumUUID, value) {
  statusCache.set(albumUUID, { value, loadedAt: Date.now() });
}

function isoToMillis(iso) {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function secondsSince(ms, now = Date.now()) {
  if (!Number.isFinite(ms)) {
    return null;
  }
  const diff = Math.max(0, now - ms);
  return Math.floor(diff / 1000);
}

function coerceRetryAfterSeconds(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.max(1, Math.round(value)) : undefined;
  }
  const parsedNumber = Number.parseFloat(value);
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) {
    return Math.max(1, Math.round(parsedNumber));
  }
  const asDate = Date.parse(String(value));
  if (Number.isFinite(asDate)) {
    const seconds = Math.ceil((asDate - Date.now()) / 1000);
    return seconds > 0 ? seconds : undefined;
  }
  return undefined;
}

function assignRetryAfter(decorated) {
  const explicitSeconds = coerceRetryAfterSeconds(decorated.retryAfterSeconds);
  if (explicitSeconds) {
    decorated.retryAfterSeconds = explicitSeconds;
    return;
  }

  if (decorated.retryAfterMs && Number.isFinite(decorated.retryAfterMs)) {
    decorated.retryAfterSeconds = Math.max(
      1,
      Math.round(decorated.retryAfterMs / 1000),
    );
    return;
  }

  let retryMs = null;
  switch (decorated.status) {
    case "running":
      retryMs = RETRY_RUNNING_MS;
      break;
    case "pending":
    case "needs-prep":
      retryMs = RETRY_PENDING_MS;
      break;
    case "stuck":
      retryMs = RETRY_STUCK_MS;
      break;
    default:
      retryMs = RETRY_DEFAULT_MS;
      break;
  }

  if (retryMs) {
    decorated.retryAfterSeconds = Math.max(1, Math.round(retryMs / 1000));
  }
}

export function withDerivedStatus(status) {
  const now = Date.now();
  const decorated =
    status && typeof status === "object" ? { ...status } : { status: "pending" };

  if (!decorated.status) {
    decorated.status = "pending";
  }
  if (!decorated.updatedAt) {
    decorated.updatedAt = new Date().toISOString();
  }

  const heartbeatMs = isoToMillis(decorated.lastHeartbeatAt);
  const progressMs = isoToMillis(decorated.lastProgressAt);
  const startedMs = isoToMillis(decorated.startedAt);
  const requestedMs = isoToMillis(decorated.lastRequestedAt);
  const updatedMs = isoToMillis(decorated.updatedAt);

  if (heartbeatMs) {
    decorated.heartbeatAgeSeconds = secondsSince(heartbeatMs, now);
  }
  if (progressMs) {
    decorated.progressAgeSeconds = secondsSince(progressMs, now);
  }

  const originalStatus = decorated.status;
  let stuckSinceMs = null;

  if (originalStatus === "running") {
    const reference = heartbeatMs ?? progressMs ?? startedMs ?? updatedMs;
    if (reference && now - reference > STUCK_RUNNING_THRESHOLD_MS) {
      stuckSinceMs = reference + STUCK_RUNNING_THRESHOLD_MS;
    }
  } else if (originalStatus === "pending" || originalStatus === "needs-prep") {
    const reference = requestedMs ?? updatedMs ?? startedMs;
    if (reference && now - reference > STUCK_PENDING_THRESHOLD_MS) {
      stuckSinceMs = reference + STUCK_PENDING_THRESHOLD_MS;
    }
  }

  if (stuckSinceMs) {
    const previous = decorated.previousStatus || originalStatus || "unknown";
    decorated.previousStatus = previous;
    if (!decorated.lastKnownStatus) {
      decorated.lastKnownStatus = previous;
    }
    decorated.status = "stuck";
    decorated.stuckSince = new Date(stuckSinceMs).toISOString();
  } else if (!decorated.previousStatus && originalStatus) {
    decorated.previousStatus = originalStatus;
  }

  assignRetryAfter(decorated);
  return decorated;
}

export async function loadStatus(albumUUID, { exportBase, photosJSON }) {
  const cached = getCached(albumUUID);
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
    const ready = {
      status: "ready",
      finishedAt: new Date().toISOString(),
    };
    return await writeStatus(albumUUID, exportBase, ready);
  }

  const decorated = withDerivedStatus(status);
  setCached(albumUUID, decorated);
  return decorated;
}

export async function writeStatus(albumUUID, exportBase, updates) {
  const statusFile = statusPath(exportBase);
  await fs.ensureDir(exportBase);
  const current =
    getCached(albumUUID) || (await readStatusFile(statusFile));
  const next = mergeStatus(current, updates);
  const timestamp = new Date().toISOString();
  next.updatedAt = timestamp;

  if (next.status === "running") {
    if (!next.startedAt) {
      next.startedAt = timestamp;
    }
    if (updates.lastHeartbeatAt === undefined && !next.lastHeartbeatAt) {
      next.lastHeartbeatAt = timestamp;
    }
  }

  if (["ready", "skipped-empty", "error"].includes(next.status)) {
    if (!next.finishedAt) {
      next.finishedAt = timestamp;
    }
    if (updates.lastHeartbeatAt === undefined && !next.lastHeartbeatAt) {
      next.lastHeartbeatAt = timestamp;
    }
  }

  if (
    updates.lastHeartbeatAt === undefined &&
    updates.lastProgressAt &&
    !next.lastHeartbeatAt
  ) {
    next.lastHeartbeatAt = updates.lastProgressAt;
  }

  const decorated = withDerivedStatus(next);
  setCached(albumUUID, decorated);
  await fs.writeJson(statusFile, next, { spaces: 2 });
  return decorated;
}

export async function recordHeartbeat(albumUUID, exportBase, extra = {}) {
  const timestamp =
    extra.lastHeartbeatAt && typeof extra.lastHeartbeatAt === "string"
      ? extra.lastHeartbeatAt
      : new Date().toISOString();
  return writeStatus(albumUUID, exportBase, {
    ...extra,
    lastHeartbeatAt: timestamp,
  });
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
  return getCached(albumUUID);
}
