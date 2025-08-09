// backend/utils/lookup-uuid-from-exported.js
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

let cache = null; // Map(exportedFilename -> uuid)
let indexPath;
let lastMtime = 0;

async function loadIndex(force = false) {
  indexPath =
    process.env.LIB_INDEX_PATH ||
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "data",
      "library",
      "filename-index.json"
    );
  if (!(await fs.pathExists(indexPath))) {
    cache = new Map();
    lastMtime = 0;
    return;
  }
  const { mtimeMs } = await fs.stat(indexPath);
  if (!force && cache && mtimeMs === lastMtime) {
    return;
  }
  const data = await fs.readJson(indexPath);
  cache = new Map(Object.entries(data));
  lastMtime = mtimeMs;
}

export async function lookupUuidByExportedFilename(exportedFilename) {
  if (!cache) {
    await loadIndex();
  }
  return cache.get(exportedFilename) || null;
}

export async function reloadIndexCache() {
  await loadIndex(true);
}
