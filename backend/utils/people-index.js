// ./utils/people-index.js

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { runPythonScript } from "./run-python-script.js";
import { getPhotosLibraryLastModified } from "./get-photos-library-last-modified.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data", "library");
const PEOPLE_INDEX_PATH = path.join(DATA_DIR, "people-index.json");
const VENV_DIR = path.join(__dirname, "..", "venv");
const PYTHON_PATH = path.join(VENV_DIR, "bin", "python3");
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "export_people_index.py");
const FILENAME_TEMPLATE_DEFAULT =
  "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}";
const JPEG_EXT_DEFAULT = "jpg";

let exportInFlight = null;
let cachedPeople = null;
let cachedMtime = null;

async function isStale() {
  const exists = await fs.pathExists(PEOPLE_INDEX_PATH);
  if (!exists) return true;

  try {
    const [stats, libraryMtime] = await Promise.all([
      fs.stat(PEOPLE_INDEX_PATH),
      getPhotosLibraryLastModified().catch(() => null),
    ]);

    if (libraryMtime && libraryMtime instanceof Date) {
      return libraryMtime.getTime() > stats.mtime.getTime();
    }
    return false;
  } catch (err) {
    if (err?.code === "ENOENT") return true;
    throw err;
  }
}

async function buildIndex() {
  await fs.ensureDir(DATA_DIR);
  await runPythonScript(
    PYTHON_PATH,
    SCRIPT_PATH,
    ["--out", PEOPLE_INDEX_PATH],
    undefined,
    {
      streamStdout: false,
      // Keep the exporter aligned with the osxphotos image export pipeline so
      // hero filenames resolve correctly against PF_LIBRARY_ROOT.
      env: {
        FILENAME_TEMPLATE:
          process.env.FILENAME_TEMPLATE || FILENAME_TEMPLATE_DEFAULT,
        JPEG_EXT: process.env.JPEG_EXT || JPEG_EXT_DEFAULT,
      },
    },
  );
  cachedPeople = null;
  cachedMtime = null;
}

export async function ensurePeopleIndexUpToDate() {
  const stale = await isStale();
  if (!stale) return;

  if (!exportInFlight) {
    exportInFlight = buildIndex().finally(() => {
      exportInFlight = null;
    });
  }

  await exportInFlight;
}

async function loadPeopleIndex() {
  await ensurePeopleIndexUpToDate();

  const stats = await fs.stat(PEOPLE_INDEX_PATH);
  if (!cachedPeople || cachedMtime !== stats.mtimeMs) {
    const data = await fs.readJson(PEOPLE_INDEX_PATH);
    cachedPeople = Array.isArray(data) ? data : Array.isArray(data?.people) ? data.people : [];
    cachedMtime = stats.mtimeMs;
  }

  return cachedPeople;
}

function compareValues(a, b, direction) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return -1 * direction;
  if (a > b) return 1 * direction;
  return 0;
}

function normalizedName(person) {
  return (person.displayName || person.name || "").trim();
}

function compareNames(a, b, direction) {
  const nameA = normalizedName(a);
  const nameB = normalizedName(b);

  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;

  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" }) * direction;
}

function selectHero(person, sortKey) {
  // Backend prefers sort-aware hero selection when the richer fields are
  // present; fall back to legacy hero fields for older people-index files.
  const heroFallbackExported = [
    person.heroExportedName,
    person.highlightExportedName,
    person.medianExportedName,
    person.latestExportedName,
    person.earliestExportedName,
  ];
  const heroFallbackUuid = [
    person.heroUuidHighlight,
    person.heroUuidMedian,
    person.heroUuidLatest,
    person.heroUuidEarliest,
    person.heroUuid,
  ];

  function buildSelection(exported, uuid) {
    return {
      heroExportedName: exported ?? heroFallbackExported.find(Boolean) ?? null,
      heroUuid: uuid ?? heroFallbackUuid.find(Boolean) ?? null,
    };
  }

  if (sortKey === "earliestPhotoAt") {
    return buildSelection(person.earliestExportedName, person.heroUuidEarliest);
  }

  if (sortKey === "latestPhotoAt") {
    return buildSelection(person.latestExportedName, person.heroUuidLatest);
  }

  if (sortKey === "medianPhotoAt") {
    return buildSelection(person.medianExportedName, person.heroUuidMedian);
  }

  // Aggregate sorts (name, photoCount, or unknown)
  return buildSelection(person.highlightExportedName, person.heroUuidHighlight);
}

export async function getPeopleSummary({ sort = "medianPhotoAt", order = "asc" } = {}) {
  const people = await loadPeopleIndex();
  const direction = order === "desc" ? -1 : 1;
  const key = sort || "medianPhotoAt";

  const sorted = [...people].sort((a, b) => {
    if (key === "name") {
      return compareNames(a, b, direction);
    }

    if (key === "photoCount") {
      const cmp = compareValues(a.photoCount, b.photoCount, direction);
      if (cmp !== 0) return cmp;
      return compareNames(a, b, 1);
    }

    if (["medianPhotoAt", "earliestPhotoAt", "latestPhotoAt"].includes(key)) {
      const aTime = a[key] ? Date.parse(a[key]) : null;
      const bTime = b[key] ? Date.parse(b[key]) : null;
      const cmp = compareValues(aTime, bTime, direction);
      if (cmp !== 0) return cmp;
      return compareNames(a, b, 1);
    }

    return compareNames(a, b, direction);
  });

  return sorted.map((person) => ({
    ...person,
    ...selectHero(person, key),
  }));
}

export const peopleIndexPaths = {
  dataDir: DATA_DIR,
  peopleIndexPath: PEOPLE_INDEX_PATH,
};
