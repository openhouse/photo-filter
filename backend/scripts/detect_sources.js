#!/usr/bin/env node
/**
 * Detect distinct camera / device sources in an album and report counts.
 *
 * Usage:
 *   node backend/scripts/detect_sources.js <ALBUM_UUID> [--json]
 *
 * With --json it prints a machine‑readable object; otherwise a table.
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { normaliseDevice } from "./helper/deviceName.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- helpers ----------------
function fmt(str) {
  return str ? String(str).trim() : "";
}

function heuristicFromFilename(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  if (upper.startsWith("DSCF")) return "Fujifilm (filename heuristic)";
  if (upper.startsWith("IMG_")) return "Apple iOS (filename heuristic)";
  if (upper.startsWith("DSC_")) return "Nikon (filename heuristic)";
  if (upper.match(/^P\d{7}/)) return "Panasonic (filename heuristic)";
  return null;
}
// -----------------------------------------

async function main() {
  const [albumUUID, flag] = process.argv.slice(2);
  if (!albumUUID) {
    console.error("❌  Please provide an album UUID");
    process.exit(1);
  }
  const albumDir = path.join(__dirname, "..", "data", "albums", albumUUID);
  const photosPath = path.join(albumDir, "photos.json");

  if (!(await fs.pathExists(photosPath))) {
    console.error(`❌  ${photosPath} not found – export the album first.`);
    process.exit(1);
  }

  const photos = await fs.readJson(photosPath);
  const tally = new Map();

  for (const p of photos) {
    const make = fmt(p.exif_info?.make);
    const model = fmt(p.exif_info?.model);
    let key =
      normaliseDevice(fmt(p.exif_info?.lens_model)) ??
      normaliseDevice(`${make} ${model}`) ??
      (make || model ? `${make} ${model}`.trim() : "");

    if (!key) {
      // Try lens_model
      key = fmt(p.exif_info?.lens_model);
    }
    if (!key) {
      key = heuristicFromFilename(p.original_filename);
    }
    if (!key) key = "Unknown";

    tally.set(key, (tally.get(key) || 0) + 1);
  }

  const result = Object.fromEntries(
    [...tally.entries()].sort((a, b) => b[1] - a[1])
  );

  if (flag === "--json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\nCamera / device sources in album", albumUUID);
    console.log("=".repeat(48));
    for (const [k, v] of Object.entries(result)) {
      console.log(k.padEnd(35), v.toString().padStart(6));
    }
    console.log("=".repeat(48), "\nTotal photos:", photos.length);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
