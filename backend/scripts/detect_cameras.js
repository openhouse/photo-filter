/**
 * List all distinct physical cameras that contributed to an album.
 *
 * USAGE
 *   node detect_cameras.js <ALBUM_UUID> [--json]
 *
 * OUTPUT
 *   By default: a nice aligned table.
 *   With --json:  JSON { cameraKey: count, ... } to stdout.
 *
 * A “cameraKey” is:  `${make}|${model}|${serial}`  where
 *   make   – EXIF "Make"  (or "Unknown")
 *   model  – EXIF "Model" (or "Unknown")
 *   serial – first non‑empty of BodySerialNumber, SerialNumber,
 *            InternalSerialNumber, CameraSerialNumber, else "Unknown"
 *
 * The script is intentionally defensive – *any* missing or non‑string
 * metadata ends up as "Unknown", never crashes the run.
 */

import { exiftool } from "exiftool-vendored";
import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a trimmed string or 'Unknown' when falsy / non‑string */
const safe = (v) =>
  typeof v === "string"
    ? v.replace(/\0/g, "").trim() || "Unknown"
    : v === undefined || v === null
      ? "Unknown"
      : String(v).trim() || "Unknown";

/** Build the physical‑camera key from an EXIF object */
function buildCameraKey(meta) {
  const make = safe(meta.Make);
  const model = safe(meta.Model ?? meta.CameraModelName);
  const serial = safe(
    meta.BodySerialNumber ??
      meta.SerialNumber ??
      meta.InternalSerialNumber ??
      meta.CameraSerialNumber
  );

  return `${make}|${model}|${serial}`;
}

/** Human‑friendly padding */
const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [, , albumUuid, ...rest] = process.argv;
  if (!albumUuid) {
    console.error("Usage: node detect_cameras.js <ALBUM_UUID> [--json]");
    process.exit(1);
  }
  const asJson = rest.includes("--json");

  // images live under backend/data/albums/<uuid>/images/…
  const imagesDir = path.join(
    __dirname,
    "..",
    "data",
    "albums",
    albumUuid,
    "images"
  );
  const patterns = ["**/*.{jpg,jpeg,JPG,JPEG,png,PNG,heic,HEIC}"];
  const imagePaths = await fg(patterns, {
    cwd: imagesDir,
    absolute: true,
    followSymbolicLinks: false,
  });

  const counts = Object.create(null);

  for (const img of imagePaths) {
    try {
      const meta = await exiftool.read(img, ["-fast"]); // faster: no huge maker notes
      const key = buildCameraKey(meta);
      counts[key] = (counts[key] ?? 0) + 1;
    } catch (err) {
      // exiftool-vendored already logs warnings; we just keep going
      console.warn(
        `⚠️  EXIF read failed for ${path.basename(img)}: ${err.message}`
      );
    }
  }

  await exiftool.end(); // close daemon

  if (asJson) {
    console.log(JSON.stringify(counts, null, 2));
  } else {
    const w1 = Math.max(...Object.keys(counts).map((k) => k.length), 10);
    const w2 = Math.max(
      ...Object.values(counts).map((n) => String(n).length),
      5
    );
    console.log(pad("Camera (Make|Model|Serial)", w1), pad("Count", w2));
    console.log("-".repeat(w1 + 1 + w2));
    for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(pad(k, w1), pad(String(n), w2));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
