// backend/scripts/bootstrap-data.js
//
// First‑run helper: guarantees data/albums.json exists so the
// API and time‑index routes don't explode on an empty repo.

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../utils/run-python-script.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    const albumsJsonPath = path.join(dataDir, "albums.json");

    // Make sure ./data exists
    await fs.ensureDir(dataDir);

    // If albums.json already present we’re done.
    if (await fs.pathExists(albumsJsonPath)) {
      console.log("[bootstrap] Library already initialised ✔︎");
      return;
    }

    console.log(
      "[bootstrap] albums.json missing – exporting albums via osxphotos…"
    );

    const venvDir = path.join(__dirname, "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "scripts",
      "export_albums.py"
    );

    await runPythonScript(pythonPath, scriptPath, [], albumsJsonPath);

    console.log(`[bootstrap] ✅  albums.json written to ${albumsJsonPath}`);
  } catch (err) {
    console.error("[bootstrap] ⚠️  bootstrap failed:", err);
    // Write an empty file so later code can proceed without crashing.
    const fallback = path.join(__dirname, "..", "data", "albums.json");
    await fs.writeJson(fallback, []);
  }
})();
