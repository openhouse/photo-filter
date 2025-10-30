import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { createReadStream } from "node:fs";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { formatPreciseTimestamp } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILENAME_TO_ALBUM = new Map();
const FILENAME_TO_ALBUM_TTL_MS = 5 * 60 * 1000;
const FILENAME_TO_ALBUM_MAX_ENTRIES = 10_000;

const PERSONS_CACHE = new Map();
const PERSONS_CACHE_TTL_MS = 10 * 60 * 1000;
const PERSONS_CACHE_MAX_ENTRIES = 2_000;

const ALBUM_LOCKS = new Map();

export async function getPeopleByFilename(req, res) {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res
        .status(400)
        .json({ errors: [{ detail: "Filename is required" }] });
    }

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    let albumUUID = getCachedAlbumUUID(filename);
    if (!albumUUID) {
      albumUUID = await findAlbumUUIDByFilename(albumsDir, filename);
      if (!albumUUID) {
        return res
          .status(404)
          .json({ errors: [{ detail: "Photo not found" }] });
      }
      cacheAlbumUUID(filename, albumUUID);
    }

    const cacheKey = `${albumUUID}:${filename}`;
    const cachedPersons = getCachedPersons(cacheKey);
    if (cachedPersons) {
      return res.json({ data: cachedPersons });
    }

    const photosPath = path.join(albumsDir, albumUUID, "photos.json");
    const persons = await runWithAlbumLock(albumUUID, async () => {
      const inLockCached = getCachedPersons(cacheKey);
      if (inLockCached) {
        return inLockCached;
      }

      const result = await findPersonsByFilenameStreaming(photosPath, filename);
      if (result !== null) {
        cachePersons(cacheKey, result);
      }
      return result;
    });

    if (persons === null) {
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    return res.json({ data: persons });
  } catch (error) {
    console.error("Error looking up persons by filename:", error);
    return res
      .status(500)
      .json({ errors: [{ detail: "Internal Server Error" }] });
  }
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
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(albumsDir, entry.name, "images", filename);
    if (await fs.pathExists(candidate)) {
      return entry.name;
    }
  }
  return null;
}

async function findPersonsByFilenameStreaming(photosPath, targetFilename) {
  if (!(await fs.pathExists(photosPath))) {
    return null;
  }

  const stream = createReadStream(photosPath).pipe(StreamArray.withParser());
  try {
    for await (const { value: photo } of stream) {
      if (!photo) continue;
      const exported = buildExportedName(photo);
      if (!exported || exported !== targetFilename) {
        continue;
      }
      return extractPersons(photo);
    }
  } finally {
    if (typeof stream.destroy === "function") {
      stream.destroy();
    }
  }

  return null;
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
  const people = new Set();
  if (Array.isArray(photo.persons)) {
    for (const name of photo.persons) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.persons_full)) {
    for (const name of photo.persons_full) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.face_names)) {
    for (const name of photo.face_names) {
      if (name) people.add(String(name));
    }
  }
  if (Array.isArray(photo.faceInfo)) {
    for (const info of photo.faceInfo) {
      if (info && info.name) people.add(String(info.name));
    }
  }
  if (Array.isArray(photo.labels)) {
    for (const label of photo.labels) {
      const value = label && typeof label === "object" ? label.name : label;
      if (value) people.add(String(value));
    }
  }
  return Array.from(people).sort((a, b) => a.localeCompare(b));
}
