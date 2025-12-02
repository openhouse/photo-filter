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
    { streamStdout: false },
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

export async function getPeopleSummary({ sort = "medianPhotoAt", order = "asc" } = {}) {
  const people = await loadPeopleIndex();
  const direction = order === "desc" ? -1 : 1;
  const key = sort || "medianPhotoAt";

  const sorted = [...people].sort((a, b) => {
    if (key === "name") {
      return (a.name || "").localeCompare(b.name || "") * direction;
    }

    if (key === "photoCount") {
      return compareValues(a.photoCount, b.photoCount, direction);
    }

    if (["medianPhotoAt", "earliestPhotoAt", "latestPhotoAt"].includes(key)) {
      const aTime = a[key] ? Date.parse(a[key]) : null;
      const bTime = b[key] ? Date.parse(b[key]) : null;
      const cmp = compareValues(aTime, bTime, direction);
      if (cmp !== 0) return cmp;
      return a.name?.localeCompare(b.name || "") || 0;
    }

    return 0;
  });

  return sorted;
}

export const peopleIndexPaths = {
  dataDir: DATA_DIR,
  peopleIndexPath: PEOPLE_INDEX_PATH,
};
