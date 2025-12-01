import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { createReadStream } from "node:fs";
import StreamArray from "stream-json/streamers/StreamArray.js";
import {
  getAlbumImagesDir,
  getLocalRoot,
  getLibraryPathForExportedName,
} from "../../config/storage-paths.js";
import { buildExportedFilename } from "../../utils/exported-filename.js";

const log = function(){}

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
  ERROR: "error",
};

// Helper: backend/data root
function getBackendRootDir() {
  // __dirname is backend/controllers/api
  // Two levels up is backend/
  return path.resolve(__dirname, "..", "..");
}

function getBackendDataDir() {
  return path.join(getBackendRootDir(), "data");
}

function readEnvInt(name, fallback) {
  log(`JB: readEnvInt(${name}, ${fallback})`);
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnvDuration(name, fallback) {
  log(`JB: readEnvDuration(${name}, ${fallback})`);
  return readEnvInt(name, fallback);
}

export async function getPeopleByFilename(req, res) {
  log(
    `JB: getPeopleByFilename: params.filename=${JSON.stringify(
      req.params?.filename,
    )}, query.filename=${JSON.stringify(req.query?.filename)}`,
  );

  try {
    const rawFilename = req.params?.filename ?? req.query?.filename ?? "";
    const normalized = normalizeLookupFilename(rawFilename);

    if (normalized.error === "missing") {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.INVALID);
      return res
        .status(400)
        .json({ errors: [{ detail: "Filename is required" }] });
    }
    if (normalized.error) {
      res.set("X-PF-Resolve", RESOLVE_SOURCES.INVALID);
      return res
        .status(400)
        .json({ errors: [{ detail: "Invalid filename" }] });
    }

    const { filename, lookupKey } = normalized;

    const cachedMiss = getCachedMiss(lookupKey);
    if (cachedMiss) {
      log(
        `JB: getPeopleByFilename: cached miss for ${lookupKey}, reason=${cachedMiss.reason}`,
      );
      res.set("X-PF-Resolve", RESOLVE_SOURCES.MISS);
      if (cachedMiss.reason) {
        res.set("X-PF-Miss-Reason", cachedMiss.reason);
      }
      return respondWithEmptyPeople(res, filename);
    }

    const albumsDir = path.join(getLocalRoot(), "albums");

    if (!(await fs.pathExists(albumsDir))) {
      console.warn(
        `JB: getPeopleByFilename: albumsDir does not exist: ${albumsDir}`,
      );
      cacheMiss(lookupKey, "uninitialized");
      res.set("X-PF-Resolve", RESOLVE_SOURCES.MISS);
      res.set("X-PF-Miss-Reason", "uninitialized");
      return respondWithEmptyPeople(res, filename);
    }

    let albumUUID = getCachedAlbumUUID(lookupKey);
    let resolveSource = albumUUID ? RESOLVE_SOURCES.CACHE : null;

    if (!albumUUID) {
      const lookupResult = await findAlbumUUIDByFilename(
        albumsDir,
        filename,
        lookupKey,
      );
      if (!lookupResult?.match) {
        log(
          `JB: getPeopleByFilename: no album match for ${filename}; missReason=${lookupResult?.missReason}`,
        );
        cacheMiss(lookupKey, lookupResult?.missReason ?? RESOLVE_SOURCES.JSON);
        res.set("X-PF-Resolve", RESOLVE_SOURCES.MISS);
        if (lookupResult?.missReason) {
          res.set("X-PF-Miss-Reason", lookupResult.missReason);
        }
        return respondWithEmptyPeople(res, filename);
      }
      albumUUID = lookupResult.match.uuid;
      resolveSource = lookupResult.match.source;
      log(
        `JB: getPeopleByFilename: album match for ${filename}: ${albumUUID} via ${resolveSource}`,
      );
      cacheAlbumUUID(lookupKey, albumUUID);
    }

    const cacheKey = `${albumUUID}:${lookupKey}`;
    const cachedPersons = getCachedPersons(cacheKey);
    if (cachedPersons !== null) {
      log(
        `JB: getPeopleByFilename: hit persons cache for ${cacheKey} (${cachedPersons.length} names)`,
      );
      res.set("X-PF-Resolve", RESOLVE_SOURCES.CACHE);
      return res.json({ filename, people: cachedPersons });
    }

    const photosPath = await getAlbumPhotosJsonPath(albumUUID);
    log(
      `JB: getPeopleByFilename: albumUUID=${albumUUID} photosPath=${photosPath}`,
    );

    if (!photosPath) {
      cacheMiss(lookupKey, RESOLVE_SOURCES.JSON);
      res.set("X-PF-Resolve", RESOLVE_SOURCES.MISS);
      res.set("X-PF-Miss-Reason", RESOLVE_SOURCES.JSON);
      return respondWithEmptyPeople(res, filename);
    }

    const { persons, source, resolvedFilename } = await runWithAlbumLock(
      albumUUID,
      async () => {
        const inLockCached = getCachedPersons(cacheKey);
        if (inLockCached !== null) {
          log(
            `JB: runWithAlbumLock: persons cache hit inside lock for ${cacheKey}`,
          );
          return { persons: inLockCached, source: RESOLVE_SOURCES.CACHE };
        }

        const result = await findPersonsByFilenameStreaming(
          photosPath,
          filename,
          lookupKey,
          {
            preferDisk: resolveSource === RESOLVE_SOURCES.DISK,
          },
        );
        if (result.persons !== null) {
          cachePersons(cacheKey, result.persons);
        }
        return result;
      },
    );

    if (persons === null) {
      log(
        `JB: getPeopleByFilename: no persons found for ${filename}, caching JSON miss`,
      );
      cacheMiss(lookupKey, RESOLVE_SOURCES.JSON);
      res.set("X-PF-Resolve", RESOLVE_SOURCES.MISS);
      res.set("X-PF-Miss-Reason", RESOLVE_SOURCES.JSON);
      return respondWithEmptyPeople(res, filename);
    }

    clearMiss(lookupKey);
    res.set("X-PF-Resolve", source ?? resolveSource ?? RESOLVE_SOURCES.JSON);
    return res.json({ filename: resolvedFilename ?? filename, people: persons });
  } catch (error) {
    console.error("Error looking up persons by filename:", error);
    res.set("X-PF-Resolve", RESOLVE_SOURCES.ERROR);
    return res
      .status(500)
      .json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

function respondWithEmptyPeople(res, filename) {
  log(`JB: respondWithEmptyPeople filename=${filename}`);
  return res.json({ filename, people: [] });
}

function getCachedAlbumUUID(key) {
  const entry = FILENAME_TO_ALBUM.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    log(`JB: getCachedAlbumUUID expired for key=${key}`);
    FILENAME_TO_ALBUM.delete(key);
    return null;
  }
  // refresh recency for simple LRU behaviour
  FILENAME_TO_ALBUM.delete(key);
  FILENAME_TO_ALBUM.set(key, entry);
  log(
    `JB: getCachedAlbumUUID hit key=${key} uuid=${entry.uuid} expiresAt=${entry.expiresAt}`,
  );
  return entry.uuid;
}

function cacheAlbumUUID(key, uuid) {
  log(`JB: cacheAlbumUUID key=${key} uuid=${uuid}`);

  if (FILENAME_TO_ALBUM.has(key)) {
    FILENAME_TO_ALBUM.delete(key);
  }
  FILENAME_TO_ALBUM.set(key, {
    uuid,
    expiresAt: Date.now() + FILENAME_TO_ALBUM_TTL_MS,
  });

  if (FILENAME_TO_ALBUM.size > FILENAME_TO_ALBUM_MAX_ENTRIES) {
    const firstKey = FILENAME_TO_ALBUM.keys().next().value;
    if (firstKey !== undefined) {
      log(
        `JB: cacheAlbumUUID evicting oldest key=${firstKey} due to size=${FILENAME_TO_ALBUM.size}`,
      );
      FILENAME_TO_ALBUM.delete(firstKey);
    }
  }
}

function getCachedPersons(key) {
  const entry = PERSONS_CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    log(`JB: getCachedPersons expired for key=${key}`);
    PERSONS_CACHE.delete(key);
    return null;
  }
  PERSONS_CACHE.delete(key);
  PERSONS_CACHE.set(key, entry);
  log(
    `JB: getCachedPersons hit key=${key} count=${entry.value.length}`,
  );
  return entry.value;
}

function cachePersons(key, persons) {
  log(
    `JB: cachePersons key=${key} count=${Array.isArray(persons) ? persons.length : 0}`,
  );

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
      log(
        `JB: cachePersons evicting oldest key=${firstKey} due to size=${PERSONS_CACHE.size}`,
      );
      PERSONS_CACHE.delete(firstKey);
    }
  }
}

function getCachedMiss(key) {
  const entry = MISS_CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    log(`JB: getCachedMiss expired for key=${key}`);
    MISS_CACHE.delete(key);
    return null;
  }
  log(
    `JB: getCachedMiss hit key=${key} reason=${entry.reason} source=${entry.source}`,
  );
  return entry;
}

function cacheMiss(key, reason = RESOLVE_SOURCES.MISS) {
  log(`JB: cacheMiss key=${key} reason=${reason}`);

  MISS_CACHE.set(key, {
    source: RESOLVE_SOURCES.MISS,
    reason,
    expiresAt: Date.now() + MISS_CACHE_TTL_MS,
  });
  if (MISS_CACHE.size > MISS_CACHE_MAX) {
    const firstKey = MISS_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      log(
        `JB: cacheMiss evicting oldest key=${firstKey} due to size=${MISS_CACHE.size}`,
      );
      MISS_CACHE.delete(firstKey);
    }
  }
}

function clearMiss(key) {
  if (MISS_CACHE.has(key)) {
    log(`JB: clearMiss key=${key}`);
  }
  MISS_CACHE.delete(key);
}

async function getAlbumPhotosJsonPath(albumUUID) {
  log(`JB: getAlbumPhotosJsonPath albumUUID=${albumUUID}`);
  if (!albumUUID) {
    log("JB: getAlbumPhotosJsonPath: missing albumUUID");
    return null;
  }

  const imagesDir = getAlbumImagesDir(albumUUID);
  const albumsRoot = path.join(getLocalRoot(), "albums");
  const dataRoot = getBackendDataDir();

  const candidates = [
    {
      reason: "album-images-photos-json",
      path: path.join(imagesDir, "photos.json"),
    },
    {
      reason: "legacy-album-root-photos-json",
      path: path.join(albumsRoot, albumUUID, "photos.json"),
    },
    {
      reason: "backend-data-albums-photos-json",
      path: path.join(dataRoot, "albums", albumUUID, "photos.json"),
    },
    {
      reason: "backend-data-library-photos-json",
      path: path.join(dataRoot, "photos.json"),
    },
  ];

  for (const candidate of candidates) {
    try {
      const exists = await fs.pathExists(candidate.path);
      log(
        `JB: getAlbumPhotosJsonPath: check [${candidate.reason}] ${candidate.path} exists=${exists}`,
      );
      if (exists) {
        log(
          `JB: getAlbumPhotosJsonPath: using [${candidate.reason}] ${candidate.path}`,
        );
        return candidate.path;
      }
    } catch (err) {
      console.error(
        `JB: getAlbumPhotosJsonPath: error checking [${candidate.reason}] ${candidate.path}`,
        err,
      );
    }
  }

  log(
    `JB: getAlbumPhotosJsonPath: no photos.json found for albumUUID=${albumUUID}`,
  );
  return null;
}

async function runWithAlbumLock(albumUUID, fn) {
  log(`JB: runWithAlbumLock albumUUID=${albumUUID}`);
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

async function findAlbumUUIDByFilename(albumsDir, filename, lookupKey) {
  log(
    `JB: findAlbumUUIDByFilename albumsDir=${albumsDir} filename=${filename} lookupKey=${lookupKey}`,
  );

  const entries = await fs.readdir(albumsDir, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  const libraryCandidate = getLibraryPathForExportedName(filename);
  const libraryExists = libraryCandidate
    ? await fs.pathExists(libraryCandidate)
    : false;
  const originalLookup = createOriginalLookup(filename);
  let missReason = RESOLVE_SOURCES.DISK;

  // First: probe disk in album images directories.
  for (let i = 0; i < directories.length; i += DISK_PROBE_CONCURRENCY) {
    const batch = directories.slice(i, i + DISK_PROBE_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (entry) => {
        const imagesDir = getAlbumImagesDir(entry.name);
        const candidate = path.join(imagesDir, filename);
        const exists = await fs.pathExists(candidate);
        if (exists) {
          log(
            `JB: findAlbumUUIDByFilename: DISK match for ${filename} in album=${entry.name} candidate=${candidate}`,
          );
          return entry.name;
        }
        return null;
      }),
    );
    const match = results.find((value) => value !== null);
    if (match) {
      return { match: { uuid: match, source: RESOLVE_SOURCES.DISK } };
    }
  }

  // Second: fall back to photos.json (per album or library-wide).
  for (const entry of directories) {
    const photosPath = await getAlbumPhotosJsonPath(entry.name);
    if (!photosPath) {
      continue;
    }
    missReason = RESOLVE_SOURCES.JSON;
    const stream = createReadStream(photosPath).pipe(StreamArray.withParser());
    try {
      for await (const { value: photo } of stream) {
        if (!photo) continue;
        const exported = resolvePhotoBasename(photo);
        if (exported && exported.key === lookupKey) {
          const source = libraryExists
            ? RESOLVE_SOURCES.DISK
            : RESOLVE_SOURCES.JSON;
          log(
            `JB: findAlbumUUIDByFilename: JSON exported match for filename=${filename} lookupKey=${lookupKey} album=${entry.name} exported=`,
            exported,
          );
          return { match: { uuid: entry.name, source } };
        }
        const originalMatch = getOriginalMatch(photo, originalLookup);
        if (originalMatch) {
          const source = libraryExists
            ? RESOLVE_SOURCES.DISK
            : RESOLVE_SOURCES.JSON;
          log(
            `JB: findAlbumUUIDByFilename: JSON original match for filename=${filename} album=${entry.name} originalMatch=`,
            originalMatch,
          );
          return { match: { uuid: entry.name, source } };
        }
      }
    } catch (error) {
      console.error(
        `JB: findAlbumUUIDByFilename: error streaming ${photosPath}`,
        error,
      );
      throw error;
    } finally {
      if (typeof stream.destroy === "function") {
        stream.destroy();
      }
    }
  }

  const missDetails = libraryExists ? RESOLVE_SOURCES.JSON : missReason;
  log(
    `JB: findAlbumUUIDByFilename: no match for filename=${filename}; missDetails=${missDetails}`,
  );
  return { match: null, missReason: missDetails };
}

async function findPersonsByFilenameStreaming(
  photosPath,
  targetFilename,
  lookupKey,
  { preferDisk = false } = {},
) {
  log(
    `JB: findPersonsByFilenameStreaming photosPath=${photosPath} targetFilename=${targetFilename} lookupKey=${lookupKey}`,
  );

  if (!(await fs.pathExists(photosPath))) {
    const source = preferDisk ? RESOLVE_SOURCES.DISK : RESOLVE_SOURCES.JSON;
    log(
      `JB: findPersonsByFilenameStreaming: photosPath does not exist; source=${source}`,
    );
    return { persons: null, source, resolvedFilename: null };
  }

  const stream = createReadStream(photosPath).pipe(StreamArray.withParser());
  const lookupOriginal = createOriginalLookup(targetFilename);
  log(
    `JB: findPersonsByFilenameStreaming: lookupOriginal=`,
    lookupOriginal,
  );

  let fallbackMatch = null;
  let fallbackMatchExported = null;
  let fallbackMatchOriginal = null;
  let fallbackMatches = 0;

  try {
    for await (const { value: photo } of stream) {
      if (!photo) continue;

      const exported = resolvePhotoBasename(photo);
      if (exported && exported.key === lookupKey) {
        const source = preferDisk ? RESOLVE_SOURCES.DISK : RESOLVE_SOURCES.JSON;
        log(
          `JB: findPersonsByFilenameStreaming: EXPORTED match for target=${targetFilename} lookupKey=${lookupKey} exported=`,
          exported,
        );
        return {
          persons: extractPersons(photo),
          source,
          resolvedFilename: exported.filename ?? targetFilename,
        };
      }

      const originalMatch = getOriginalMatch(photo, lookupOriginal);
      if (originalMatch) {
        fallbackMatches += 1;
        log(
          `JB: findPersonsByFilenameStreaming: ORIGINAL fallback match #${fallbackMatches} for target=${targetFilename} originalMatch=`,
          originalMatch,
        );
        if (fallbackMatches === 1) {
          fallbackMatch = photo;
          fallbackMatchExported = exported;
          fallbackMatchOriginal = originalMatch;
        }
      }
    }
  } catch (error) {
    console.error(
      `JB: findPersonsByFilenameStreaming: error while streaming ${photosPath}`,
      error,
    );
    throw error;
  } finally {
    if (typeof stream.destroy === "function") {
      stream.destroy();
    }
  }

  if (fallbackMatches === 1 && fallbackMatch) {
    const source = preferDisk ? RESOLVE_SOURCES.DISK : RESOLVE_SOURCES.JSON;
    const resolvedFilename =
      fallbackMatchExported?.filename ??
      fallbackMatchOriginal?.filename ??
      targetFilename;
    log(
      `JB: findPersonsByFilenameStreaming: using ORIGINAL fallback match for target=${targetFilename}, resolvedFilename=${resolvedFilename}`,
    );
    return {
      persons: extractPersons(fallbackMatch),
      source,
      resolvedFilename,
    };
  }

  const source = preferDisk ? RESOLVE_SOURCES.DISK : RESOLVE_SOURCES.JSON;
  log(
    `JB: findPersonsByFilenameStreaming: no match for target=${targetFilename}; source=${source}`,
  );
  return { persons: null, source, resolvedFilename: null };
}

function normalizeLookupFilename(rawInput) {
  log(`JB: normalizeLookupFilename rawInput=${rawInput}`);

  const str =
    typeof rawInput === "string"
      ? rawInput
      : rawInput != null
      ? rawInput.toString()
      : "";

  const trimmed = str.trim();
  log(`JB: normalizeLookupFilename trimmed=${trimmed}`);

  if (!trimmed) {
    log(`JB: normalizeLookupFilename -> missing`);
    return { error: "missing" };
  }
  if (/[\\/]/.test(trimmed) || path.basename(trimmed) !== trimmed) {
    log(`JB: normalizeLookupFilename -> invalid (path traversal)`);
    return { error: "invalid" };
  }
  const candidate = path.basename(trimmed).normalize("NFC");
  log(`JB: normalizeLookupFilename candidate=${candidate}`);

  if (!candidate || /[\u0000-\u001F\u007F]/.test(candidate)) {
    log(`JB: normalizeLookupFilename -> invalid (bad chars)`);
    return { error: "invalid" };
  }
  const lookupKey = toLookupKey(candidate);
  log(`JB: normalizeLookupFilename lookupKey=${lookupKey}`);

  if (!lookupKey) {
    log(
      `JB: normalizeLookupFilename -> invalid (lookupKey could not be built)`,
    );
    return { error: "invalid" };
  }

  return { filename: candidate, lookupKey };
}

function resolvePhotoBasename(photo) {
  const candidate = getPhotoFilenameCandidate(photo);
  if (!candidate) return null;
  const sanitized = sanitizeMetadataFilename(candidate);
  if (!sanitized) return null;
  const key = toLookupKey(sanitized);
  if (!key) return null;
  return { filename: sanitized, key };
}

function getPhotoFilenameCandidate(photo) {
  if (!photo) return null;
  const candidates = [
    photo.file_basename,
    photo.fileBasename,
    photo.file_base_name,
    photo.fileBaseName,
    photo.exported_filename,
    photo.exportedFilename,
    photo.export_filename,
    photo.exportFilename,
    photo.filename,
    photo.fileName,
    photo.basename,
    photo.base_name,
    photo.baseName,
    photo.name,
    photo.asset_filename,
    photo.assetFilename,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return buildExportedFilename(photo);
}

function sanitizeMetadataFilename(value) {
  if (!value) return null;
  const asString = value.toString().trim();
  if (!asString) return null;
  const basename = path.basename(asString);
  if (!basename) return null;
  const normalized = basename.normalize("NFC");
  if (!normalized || /[\u0000-\u001F\u007F]/.test(normalized)) {
    return null;
  }
  return normalized;
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

function toLookupKey(value) {
  if (!value) return null;
  const asString = value.toString();
  if (!asString) return null;
  const trimmed = asString.trim();
  if (!trimmed) return null;
  const dotIndex = trimmed.lastIndexOf(".");
  const withoutExtension = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const normalized = withoutExtension.normalize("NFC").toLowerCase();
  return normalized || null;
}

function extractOriginalChunkFromExported(filename) {
  if (!filename) return null;
  const base = path.basename(filename);
  const dashIndex = base.indexOf("-");
  if (dashIndex === -1) return null;
  const chunk = base.slice(dashIndex + 1);
  return chunk || null;
}

function getOriginalFilenameCandidate(photo) {
  if (!photo) return null;

  const candidates = [
    photo.original_filename,
    photo.originalFilename,
    photo.original_name,
    photo.originalName,
    photo.asset_filename,
    photo.assetFilename,
    photo.filename,
    photo.fileName,
    photo.name,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function normalizeOriginalName(value) {
  if (!value) return null;
  const sanitized = sanitizeMetadataFilename(value);
  if (!sanitized) return null;
  const normalized = sanitized.toLowerCase();
  const key = toLookupKey(sanitized);
  if (!key) return null;
  return { filename: sanitized, normalized, key };
}

function createOriginalLookup(filename) {
  const chunk = extractOriginalChunkFromExported(filename);
  if (!chunk) {
    return null;
  }
  return normalizeOriginalName(chunk);
}

function getOriginalMatch(photo, lookupOriginal) {
  if (!lookupOriginal) return null;
  const candidate = getOriginalFilenameCandidate(photo);
  if (!candidate) return null;
  const normalized = normalizeOriginalName(candidate);
  if (!normalized) return null;
  const fullMatch = normalized.normalized === lookupOriginal.normalized;
  const stemMatch = normalized.key === lookupOriginal.key;
  return fullMatch || stemMatch ? normalized : null;
}
