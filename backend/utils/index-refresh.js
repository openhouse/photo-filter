// Utility to refresh the filename index. Designed to be run at startup.
//
// The script reads optional environment variables FILENAME_TEMPLATE and
// JPEG_EXT, trimming surrounding quotes for safety. Regardless of whether the
// index needs rebuilding, the template (and JPEG extension if provided) are
// logged so callers can attest to the invariant.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const DEFAULT_TEMPLATE = "{created.utc.strftime,%Y%m%dT%H%M%S%fZ}-{original_name}{ext}";
const sanitize = (s) => (s ? s.replace(/^['"]|['"]$/g, "") : s);
const TEMPLATE = sanitize(process.env.FILENAME_TEMPLATE) || DEFAULT_TEMPLATE;
const JPEG_EXT = sanitize(process.env.JPEG_EXT);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_PATH = path.join(__dirname, "../data/library/filename-index.json");
const COLLISIONS_PATH = path.join(
  __dirname,
  "../data/library/filename-collisions.json",
);

async function buildIndex() {
  const script = path.join(process.cwd(), "scripts", "build_filename_index.py");
  const args = [
    script,
    "--output",
    INDEX_PATH,
    "--collisions",
    COLLISIONS_PATH,
    "--template",
    TEMPLATE,
  ];
  if (JPEG_EXT) {
    args.push("--jpeg-ext", JPEG_EXT);
  }
  const venv = path.join(process.cwd(), "backend/venv/bin/python3");
  const python = fs.existsSync(venv) ? venv : "python3";
  console.log("[index] using python:", python);
  await new Promise((resolve, reject) => {
    const proc = spawn(python, args, { stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build_filename_index exited with ${code}`));
    });
  });
}

async function refresh() {
  await buildIndex();
  console.log("[index] template in use:", TEMPLATE);
  if (JPEG_EXT) console.log("[index] jpeg extension:", JPEG_EXT);
}

refresh().catch((err) => {
  console.error("[index] refresh failed", err);
  console.log("[index] template in use:", TEMPLATE);
  if (JPEG_EXT) console.log("[index] jpeg extension:", JPEG_EXT);
  process.exit(1);
});
