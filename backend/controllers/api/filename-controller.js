import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { createReadStream } from "node:fs";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { formatPreciseTimestamp } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILENAME_TO_ALBUM = new Map();
const PERSONS_CACHE = new Map();
const MISS_CACHE = new Map();

const DEFAULT_FILENAME_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_FILENAME_CACHE_MAX = 10_000;
const DEFAULT_PERSONS_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_PERSONS_CACHE_MAX = 2_000;
const MISS_CACHE_TTL_MS = 60 * 1000;
const MISS_CACHE_MAX = 500;
const DISK_PROBE_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.PF_DISK_PROBE_CONCURRENCY ?? "4", 10),
);

const FILENAME_TO_ALBUM_TTL_MS = readEnvDuration(
  "PF_FILENAME_CACHE_TTL_MS",
  DEFAULT_FILENAME_CACHE_TTL_MS,
);
const FILENAME_TO_ALBUM_MAX_ENTRIES = readEnvInt(
  "PF_FILENAME_CACHE_MAX",
  DEFAULT_FILENAME_CACHE_MAX,
);
const PERSONS_CACHE_TTL_MS = readEnvDuration(
  "PF_PERSONS_CACHE_TTL_MS",
  DEFAULT_PERSONS_CACHE_TTL_MS,
);
const PERSONS_CACHE_MAX_ENTRIES = readEnvInt(
  "PF_PERSONS_CACHE_MAX",
  DEFAULT_PERSONS_CACHE_MAX,
);

const ALBUM_LOCKS = new Map();

const RESOLVE_SOURCES = {
  CACHE: "cache",
  DISK: "disk",
  JSON: "json",
  MISS: "miss",
  INVALID: "invalid",
};

function readEnvInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnvDuration(name, fallback) {
  return readEnvInt(name, fallback);
}

export async function getPeopleByFilename(req, res) {
  try {
    const rawFilename =
      (req.params?.filename ?? req.query?.filename ?? "").toString();
    const trimmed = rawFilename.trim();
    if (!trimmed) {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.INVALID);
      return res
        .status(400)
        .json({ errors: [{ detail: "Filename is required" }] });
    }

    const filename = sanitizeFilename(trimmed);
    if (!filename) {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.INVALID);
      return res
        .status(400)
        .json({ errors: [{ detail: "Invalid filename" }] });
    }

    const cachedMiss = getCachedMiss(filename);
    if (cachedMiss) {
      res.set("X-PF-Resolve", cachedMiss);
      return res
        .status(404)
        .json({ errors: [{ detail: "Photo not found" }] });
    }

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.JSON);
      return res
        .status(404)
        .json({ errors: [{ detail: "Photo not found" }] });
    }

    let albumUUID = getCachedAlbumUUID(filename);
    let resolveSource = albumUUID ? RESOLVE_SOURCES.CACHE : null;
    if (!albumUUID) {
      const lookupResult = await findAlbumUUIDByFilename(albumsDir, filename);
      if (!lookupResult) {
        cacheMiss(filename);
        res.set("X-PF-Resolve", RESOLVE_SOURCES.JSON);
        return res
          .status(404)
          .json({ errors: [{ detail: "Photo not found" }] });
      }
      albumUUID = lookupResult.uuid;
      resolveSource = lookupResult.source;
      cacheAlbumUUID(filename, albumUUID);
    }

    const cacheKey = `${albumUUID}:${filename}`;
    const cachedPersons = getCachedPersons(cacheKey);
    if (cachedPersons) {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.CACHE);
      return res.json({ data: cachedPersons });
    }

    const photosPath = path.join(albumsDir, albumUUID, "photos.json");
    const { persons, source } = await runWithAlbumLock(albumUUID, async () => {
      const inLockCached = getCachedPersons(cacheKey);
      if (inLockCached) {
        return { persons: inLockCached, source: RESOLVE_SOURCES.CACHE };
      }

      const result = await findPersonsByFilenameStreaming(photosPath, filename);
      if (result.persons !== null) {
        cachePersons(cacheKey, result.persons);
      }
      return result;
    });

    if (persons === null) {
      cacheMiss(filename);
      res.set("X-PF-Resolve", source ?? resolveSource ?? RESOLVE_SOURCES.JSON);
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    clearMiss(filename);
    res.set("X-PF-Resolve", source ?? resolveSource ?? RESOLVE_SOURCES.JSON);
    return res.json({ data: persons });
  } catch (error) {
    console.error("Error looking up persons by filename:", error);
    res.set("X-PF-Resolve", RESOLVE_SOURCES.JSON);
    return res
      .status(500)
      .json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

function sanitizeFilename(input) {
  const candidate = input.normalize("NFC");
  if (!candidate || /[\\/]/.test(candidate)) {
    return null;
  }
  if (/[\u0000-\u001F\u007F]/.test(candidate)) {
    return null;
  }
  if (path.basename(candidate) !== candidate) {
    return null;
  }
  return candidate;
}

function getCachedAlbumUUID(name) {
  const entry = FILENAME_TO_ALBUM.get(name);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    FILENAME_TO_ALBUM.delete(name);
    return null;
  }
  // refresh recency for simple LRU behaviour
  FILENAME_TO_ALBUM.delete(name);
  FILENAME_TO_ALBUM.set(name, entry);
  return entry.uuid;
}

function cacheAlbumUUID(name, uuid) {
  if (FILENAME_TO_ALBUM.has(name)) {
    FILENAME_TO_ALBUM.delete(name);
  }
  FILENAME_TO_ALBUM.set(name, {
    uuid,
    expiresAt: Date.now() + FILENAME_TO_ALBUM_TTL_MS,
  });

  if (FILENAME_TO_ALBUM.size > FILENAME_TO_ALBUM_MAX_ENTRIES) {
    const firstKey = FILENAME_TO_ALBUM.keys().next().value;
    if (firstKey !== undefined) {
      FILENAME_TO_ALBUM.delete(firstKey);
    }
  }
}

function getCachedPersons(key) {
  const entry = PERSONS_CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    PERSONS_CACHE.delete(key);
    return null;
  }
  PERSONS_CACHE.delete(key);
  PERSONS_CACHE.set(key, entry);
  return entry.value;
}

function cachePersons(key, persons) {
  if (PERSONS_CACHE.has(key)) {
    PERSONS_CACHE.delete(key);
  }
  PERSONS_CACHE.set(key, {
    value: persons,
    expiresAt: Date.now() + PERSONS_CACHE_TTL_MS,
  });

  if (PERSONS_CACHE.size > PERSONS_CACHE_MAX_ENTRIES) {
    const firstKey = PERSONS_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      PERSONS_CACHE.delete(firstKey);
    }
  }
}

function getCachedMiss(name) {
  const entry = MISS_CACHE.get(name);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    MISS_CACHE.delete(name);
    return null;
  }
  return entry.source;
}

function cacheMiss(name, source = RESOLVE_SOURCES.MISS) {
  MISS_CACHE.set(name, {
    source,
    expiresAt: Date.now() + MISS_CACHE_TTL_MS,
  });
  if (MISS_CACHE.size > MISS_CACHE_MAX) {
    const firstKey = MISS_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      MISS_CACHE.delete(firstKey);
    }
  }
}

function clearMiss(name) {
  MISS_CACHE.delete(name);
}

async function runWithAlbumLock(albumUUID, fn) {
  const previous = ALBUM_LOCKS.get(albumUUID) ?? Promise.resolve();
  const runPromise = previous.then(() => fn());
  const queuePromise = runPromise.finally(() => {
    if (ALBUM_LOCKS.get(albumUUID) === queuePromise) {
      ALBUM_LOCKS.delete(albumUUID);
    }
  });
  ALBUM_LOCKS.set(albumUUID, queuePromise);
  return runPromise;
}

async function findAlbumUUIDByFilename(albumsDir, filename) {
  const entries = await fs.readdir(albumsDir, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());

  for (let i = 0; i < directories.length; i += DISK_PROBE_CONCURRENCY) {
    const batch = directories.slice(i, i + DISK_PROBE_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (entry) => {
        const candidate = path.join(albumsDir, entry.name, "images", filename);
        if (await fs.pathExists(candidate)) {
          return entry.name;
        }
        return null;
      }),
    );
    const match = results.find((value) => value !== null);
    if (match) {
      return { uuid: match, source: RESOLVE_SOURCES.DISK };
    }
  }

  for (const entry of directories) {
    const photosPath = path.join(albumsDir, entry.name, "photos.json");
    if (!(await fs.pathExists(photosPath))) {
      continue;
    }
    const stream = createReadStream(photosPath).pipe(StreamArray.withParser());
    try {
      for await (const { value: photo } of stream) {
        if (!photo) continue;
        const exported = buildExportedName(photo);
        if (exported && exported === filename) {
          return { uuid: entry.name, source: RESOLVE_SOURCES.JSON };
        }
      }
    } catch (error) {
      throw error;
    } finally {
      if (typeof stream.destroy === "function") {
        stream.destroy();
      }
    }
  }

  return null;
}

async function findPersonsByFilenameStreaming(photosPath, targetFilename) {
  if (!(await fs.pathExists(photosPath))) {
    return { persons: null, source: RESOLVE_SOURCES.JSON };
  }

  const stream = createReadStream(photosPath).pipe(StreamArray.withParser());
  try {
    for await (const { value: photo } of stream) {
      if (!photo) continue;
      const exported = buildExportedName(photo);
      if (!exported || exported !== targetFilename) {
        continue;
      }
      return { persons: extractPersons(photo), source: RESOLVE_SOURCES.JSON };
    }
  } catch (error) {
    throw error;
  } finally {
    if (typeof stream.destroy === "function") {
      stream.destroy();
    }
  }

  return { persons: null, source: RESOLVE_SOURCES.JSON };
}

function buildExportedName(photo) {
  try {
    const originalSource = photo.original_filename || photo.originalFilename;
    if (!originalSource) return null;
    const originalName = path.parse(originalSource).name;
    if (!originalName) return null;
    const rawDate = photo.date ?? photo.creation_date ?? photo.creationDate;
    if (!rawDate) return null;
    const timestamp = formatPreciseTimestamp(rawDate);
    return `${timestamp}-${originalName}.jpg`;
  } catch (err) {
    return null;
  }
}

function extractPersons(photo) {
  const names = [
    ...(Array.isArray(photo.persons) ? photo.persons : []),
    ...(Array.isArray(photo.persons_full) ? photo.persons_full : []),
    ...(Array.isArray(photo.face_names) ? photo.face_names : []),
    ...((Array.isArray(photo.faceInfo) ? photo.faceInfo : [])
      .map((info) => info?.name)
      .filter(Boolean)),
  ]
    .filter(Boolean)
    .map((value) => value.toString());

  const unique = Array.from(new Set(names));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}
