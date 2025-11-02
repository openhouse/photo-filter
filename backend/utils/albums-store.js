// ./utils/albums-store.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

import { runPythonScript } from "./run-python-script.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const ALBUMS_PATH = path.join(DATA_DIR, "albums.json");
const STATUS_PATH = path.join(DATA_DIR, "export-status.json");
const VENV_DIR = path.join(__dirname, "..", "venv");
const PYTHON_PATH = path.join(VENV_DIR, "bin", "python3");
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "export_albums.py");

export const EXPORT_RETRY_AFTER_SECONDS = 1;

export const albumsPaths = {
  dataDir: DATA_DIR,
  albumsPath: ALBUMS_PATH,
  statusPath: STATUS_PATH,
};

let exportInFlight = null;

async function runAlbumsExporter() {
  await fs.ensureDir(DATA_DIR);
  console.log("Exporting albums using osxphotos...");
  await runPythonScript(
    PYTHON_PATH,
    SCRIPT_PATH,
    ["--output", ALBUMS_PATH, "--status", STATUS_PATH],
    undefined,
    { streamStdout: false },
  );
  console.log("Albums export complete.");
}

export async function ensureAlbumsExported() {
  await fs.ensureDir(DATA_DIR);

  if (await fs.pathExists(ALBUMS_PATH)) {
    return;
  }

  if (!exportInFlight) {
    exportInFlight = runAlbumsExporter().finally(() => {
      exportInFlight = null;
    });
  }

  await exportInFlight;
}

export function isTransientJsonError(error) {
  return (
    error?.code === "ENOENT" ||
    error instanceof SyntaxError ||
    error?.name === "SyntaxError"
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readJsonWithRetry(file, options = {}) {
  const { retries = 5, delayMs = 200 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const text = await fs.readFile(file, "utf8");
      return JSON.parse(text);
    } catch (error) {
      if (!isTransientJsonError(error) || attempt === retries) {
        throw error;
      }
      await delay(delayMs);
    }
  }

  throw new Error(`Unable to read stable JSON from ${file}`);
}

export async function readExportStatus() {
  try {
    const text = await fs.readFile(STATUS_PATH, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
