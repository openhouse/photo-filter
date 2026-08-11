import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { getLocalRoot } from "../config/storage-paths.js";
import { buildExportedFilename } from "../utils/exported-filename.js";
import {
  createOriginalLookup,
  extractPersons,
  getOriginalFilenameCandidate,
  normalizeLookupFilename,
  normalizeOriginalName,
  resolvePhotoBasename,
} from "../controllers/api/filename-controller.js";

export const PEOPLE_INDEX_SCHEMA_VERSION = 1;
const CORPUS_SALT = "photo-filter-people-index-v1\0";

function indexError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizeRelativePath(value) {
  return String(value).split(path.sep).join("/").normalize("NFC");
}

async function scanSource(source, openSource, onPhoto) {
  const hash = crypto.createHash("sha256");
  const tap = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const stream = openSource(source.absolutePath)
    .pipe(tap)
    .pipe(StreamArray.withParser());
  try {
    for await (const { value } of stream) {
      if (value) onPhoto(value, source);
    }
  } finally {
    stream.destroy?.();
  }
  return hash.digest("hex");
}

export async function buildPeopleSnapshot(
  sources,
  { openSource = createReadStream } = {},
) {
  const ordered = [...sources]
    .map((source) => ({
      ...source,
      relativePath: normalizeRelativePath(source.relativePath),
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (ordered.length === 0) {
    throw indexError(
      "PEOPLE_INDEX_NO_SOURCES",
      "No active photos.json sources were found",
      503,
    );
  }
  const exact = new Map();
  const aliases = new Map();
  const records = new Map();
  const manifest = [];
  let entryCount = 0;

  for (const source of ordered) {
    const sourceSha256 = await scanSource(source, openSource, (photo) => {
      const exported = resolvePhotoBasename(photo);
      if (!exported) return;
      const generated = normalizeLookupFilename(buildExportedFilename(photo));
      const semantic = generated.error
        ? exported
        : {
            filename: generated.filename,
            key: generated.lookupKey,
          };
      let record = records.get(semantic.key);
      if (!record) {
        record = {
          resolvedFilename: exported.filename,
          people: new Set(),
          albumUUIDs: new Set(),
        };
        records.set(semantic.key, record);
      }
      for (const person of extractPersons(photo)) record.people.add(person);
      record.albumUUIDs.add(source.albumUUID);
      if (!exact.has(exported.key)) exact.set(exported.key, record);
      if (!exact.has(semantic.key)) exact.set(semantic.key, record);

      const original = normalizeOriginalName(
        getOriginalFilenameCandidate(photo),
      );
      if (original) {
        const candidates = aliases.get(original.key) ?? new Map();
        candidates.set(semantic.key, record);
        aliases.set(original.key, candidates);
      }
      entryCount += 1;
    });
    manifest.push({
      relativePath: source.relativePath,
      sourceSha256,
      albumUUID: source.albumUUID,
    });
  }

  const corpus = crypto.createHash("sha256");
  corpus.update(CORPUS_SALT);
  for (const source of manifest) {
    corpus.update(source.relativePath);
    corpus.update("\0");
    corpus.update(source.sourceSha256);
    corpus.update("\0");
  }

  const frozenRecords = new Map(
    [...records.values()].map((record) => [
      record,
      Object.freeze({
        resolvedFilename: record.resolvedFilename,
        people: Object.freeze(
          [...record.people].sort((a, b) => a.localeCompare(b)),
        ),
        albumUUIDs: Object.freeze([...record.albumUUIDs]),
      }),
    ]),
  );
  for (const [key, record] of exact) {
    exact.set(key, frozenRecords.get(record));
  }
  for (const [key, candidates] of aliases) {
    aliases.set(
      key,
      new Map(
        [...candidates.keys()].map((identityKey) => [
          identityKey,
          frozenRecords.get(candidates.get(identityKey)),
        ]),
      ),
    );
  }

  return Object.freeze({
    schemaVersion: PEOPLE_INDEX_SCHEMA_VERSION,
    corpusSha256: corpus.digest("hex"),
    generatedAt: new Date().toISOString(),
    sourceCount: manifest.length,
    entryCount,
    sources: Object.freeze(manifest),
    exact,
    aliases,
  });
}

function result(filename, status, record = null) {
  return {
    filename,
    resolvedFilename: record?.resolvedFilename ?? null,
    people: record ? [...record.people] : [],
    status,
  };
}

export function lookupPeopleInSnapshot(snapshot, rawFilename) {
  const normalized = normalizeLookupFilename(rawFilename);
  const requested =
    typeof rawFilename === "string" ? rawFilename : String(rawFilename ?? "");
  if (normalized.error) return result(requested, "invalid");

  const exact = snapshot.exact.get(normalized.lookupKey);
  if (exact) return result(normalized.filename, "exact", exact);

  const original = createOriginalLookup(normalized.filename);
  if (!original) return result(normalized.filename, "missing");
  const candidates = snapshot.aliases.get(original.key) ?? new Map();
  if (candidates.size === 1) {
    return result(normalized.filename, "alias", candidates.values().next().value);
  }
  if (candidates.size > 1) return result(normalized.filename, "ambiguous");
  return result(normalized.filename, "missing");
}

export async function listActivePeopleSources() {
  const localRoot = getLocalRoot();
  const albumsDir = path.join(localRoot, "albums");
  const backendRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const backendData = process.env.PF_PEOPLE_METADATA_ROOT
    ? path.resolve(process.env.PF_PEOPLE_METADATA_ROOT)
    : path.join(backendRoot, "data");
  const entries = (await fs.readdir(albumsDir, { withFileTypes: true }).catch(
    (error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    },
  ))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const sources = [];
  const seen = new Set();

  for (const entry of entries) {
    const candidates = [
      [
        path.join(albumsDir, entry.name, "images", "photos.json"),
        `albums/${entry.name}/images/photos.json`,
      ],
      [
        path.join(albumsDir, entry.name, "photos.json"),
        `albums/${entry.name}/photos.json`,
      ],
      [
        path.join(backendData, "albums", entry.name, "photos.json"),
        `backend-data/albums/${entry.name}/photos.json`,
      ],
      [path.join(backendData, "photos.json"), "backend-data/photos.json"],
    ];
    for (const [absolutePath, relativePath] of candidates) {
      if (!(await fs.pathExists(absolutePath))) continue;
      const key = path.resolve(absolutePath);
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({
          albumUUID: entry.name,
          absolutePath,
          relativePath,
        });
      }
      break;
    }
  }
  return sources;
}

export function createPeopleIndexService({
  listSources = listActivePeopleSources,
  buildSnapshot = buildPeopleSnapshot,
} = {}) {
  let snapshot = null;
  let lastRefreshError = null;
  let refreshPromise = null;

  async function refresh({ mode = "verify" } = {}) {
    if (mode !== "verify" && mode !== "force") {
      throw indexError("INVALID_REFRESH_MODE", "Invalid refresh mode", 400);
    }
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const candidate = await buildSnapshot(await listSources());
        const unchanged =
          mode !== "force" &&
          snapshot?.corpusSha256 === candidate.corpusSha256;
        if (!unchanged) snapshot = candidate;
        lastRefreshError = null;
        return {
          snapshot,
          indexStatus: unchanged
            ? "verified"
            : mode === "force"
              ? "forced"
              : "rebuilt",
        };
      } catch (error) {
        lastRefreshError = {
          at: new Date().toISOString(),
          message: error?.message ?? String(error),
        };
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  async function selectSnapshot({
    refresh: mode = "verify",
    expectedCorpusSha256,
  } = {}) {
    let selected;
    if (mode === "snapshot") {
      if (!snapshot) {
        throw indexError(
          "PEOPLE_INDEX_UNAVAILABLE",
          "No verified people-index snapshot is loaded",
          409,
        );
      }
      selected = { snapshot, indexStatus: "snapshot" };
    } else if (mode === "verify" || mode === "force") {
      selected = await refresh({ mode });
    } else {
      throw indexError("INVALID_REFRESH_MODE", "Invalid refresh mode", 400);
    }
    if (
      expectedCorpusSha256 &&
      expectedCorpusSha256 !== selected.snapshot.corpusSha256
    ) {
      throw indexError(
        "PEOPLE_CORPUS_MISMATCH",
        "The requested people-index corpus is not loaded",
        409,
      );
    }
    return selected;
  }

  return {
    refresh,
    async resolve(filenames, options = {}) {
      const selected = await selectSnapshot(options);
      return {
        data: filenames.map((filename) =>
          lookupPeopleInSnapshot(selected.snapshot, filename),
        ),
        meta: {
          schemaVersion: selected.snapshot.schemaVersion,
          corpusSha256: selected.snapshot.corpusSha256,
          sourceCount: selected.snapshot.sourceCount,
          entryCount: selected.snapshot.entryCount,
          indexStatus: selected.indexStatus,
          sourceFreshness: "unknown",
        },
      };
    },
    status() {
      return {
        schemaVersion: PEOPLE_INDEX_SCHEMA_VERSION,
        loaded: Boolean(snapshot),
        corpusSha256: snapshot?.corpusSha256 ?? null,
        generatedAt: snapshot?.generatedAt ?? null,
        sourceCount: snapshot?.sourceCount ?? 0,
        entryCount: snapshot?.entryCount ?? 0,
        sources: snapshot?.sources ?? [],
        sourceFreshness: "unknown",
        lastRefreshError,
      };
    },
  };
}
