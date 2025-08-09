// backend/utils/index-refresh.js
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { getPhotosLibraryLastModified } from "./get-photos-library-last-modified.js";
import { reloadIndexCache } from "./lookup-uuid-from-exported.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDir = path.join(__dirname, "..", "data", "library");
const metaPath = path.join(libDir, "index-meta.json");
const indexPath =
  process.env.LIB_INDEX_PATH || path.join(libDir, "filename-index.json");
const tmpPath = `${indexPath}.tmp`;

const DEFAULT_TEMPLATE =
  "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}";
const sanitize = (s) => (s ? s.replace(/^['"]|['"]$/g, "") : s);
const TEMPLATE = sanitize(process.env.FILENAME_TEMPLATE) || DEFAULT_TEMPLATE;
const JPEG_EXT = sanitize(process.env.JPEG_EXT);

let inflight = null;

export async function ensureFilenameIndexFresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    await fs.ensureDir(libDir);
    const mtime = await getPhotosLibraryLastModified().catch(() => null);
    const logTemplate = () => {
      let msg = `[index] template in use: ${TEMPLATE}`;
      if (JPEG_EXT) msg += ` (jpeg-ext: ${JPEG_EXT})`;
      console.log(msg);
    };
    if (!mtime) {
      logTemplate();
      return;
    }
    const meta = (await fs.pathExists(metaPath))
      ? await fs.readJson(metaPath)
      : null;
    const current = meta?.photosLibraryMtime
      ? new Date(meta.photosLibraryMtime)
      : null;
    if (current && current >= mtime) {
      logTemplate();
      return; // already fresh
    }

    logTemplate();
    await runIndexBuilder(tmpPath);
    await fs.move(tmpPath, indexPath, { overwrite: true });
    await fs.writeJson(metaPath, {
      photosLibraryMtime: mtime.toISOString(),
      generatedAt: new Date().toISOString(),
    });
    console.log("[index] rebuilt at", new Date().toISOString());
    try {
      await reloadIndexCache();
    } catch (e) {
      console.error("[index] cache reload failed", e);
    }
  })()
    .catch((err) => {
      console.error("[index] rebuild failed", err);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function runIndexBuilder(dest) {
  return new Promise((resolve, reject) => {
    const venvPy = path.join(__dirname, "..", "venv", "bin", "python3");
    let py = process.env.PYTHON_BIN;
    if (py && !path.isAbsolute(py)) {
      // PYTHON_BIN set relative to repo root; normalize
      py = path.join(__dirname, "..", "..", py);
    }
    if (!py) {
      py = fs.existsSync(venvPy) ? venvPy : "python3";
    }

    const script = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "build_filename_index.py"
    );
    const args = [script, "--output", dest, "--template", TEMPLATE];
    if (JPEG_EXT) {
      args.push("--jpeg-ext", JPEG_EXT);
    }
    const child = spawn(py, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`index builder exited with code ${code}`));
    });
  });
}

