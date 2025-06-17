// backend/utils/export-images.js
//
// Export JPEGs from an album with **UTC‑based, micro‑second‑precise** names:
//
//     20250531T174503000123Z-DSCF7309.jpg
//
// ‑ UTC eliminates cross‑camera drift
// ‑ Micro‑seconds guarantee uniqueness
// ‑ The prefix sorts lexicographically == chronologically

import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { execCommand } from "./exec-command.js";

/**
 * Ensure the installed osxphotos is new enough for the `utc` template filter.
 * Throws with a helpful upgrade hint if the version is < 0.71.0.
 *
 * @param {string} osxphotosPath – absolute path to the osxphotos binary
 */
function assertOsxphotosSupportsUtc(osxphotosPath) {
  let versionString;
  try {
    versionString = execSync(`"${osxphotosPath}" --version`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(
      `Unable to execute \`${osxphotosPath} --version\` — is the binary path correct?`
    );
  }

  // Very small, dependency‑free semver comparator
  const [major, minor, patch] = versionString
    .split(".")
    .map((n) => parseInt(n, 10));

  const tooOld =
    Number.isNaN(major) ||
    (major === 0 && minor < 71) || // 0.70.x or below
    major < 0; // clearly broken parse

  if (tooOld) {
    throw new Error(
      [
        `osxphotos ${versionString} is too old; the “|utc” template filter`,
        `needs ≥ 0.71.0.  Upgrade inside backend/venv with:`,
        ``,
        `    pip install --upgrade "osxphotos>=0.72.0"`,
        ``,
      ].join("\n")
    );
  }
}

/**
 * Export JPEGs from an album.
 *
 * @param {string} osxphotosPath – absolute path to the `osxphotos` binary
 * @param {string} albumUUID    – Photos album UUID  (unused here but kept for API parity)
 * @param {string} imagesDir    – destination directory
 * @param {string} photosPath   – path to the album’s photos.json
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // 0.  Verify osxphotos capability before doing any work
  assertOsxphotosSupportsUtc(osxphotosPath);

  // 1.  Collect the UUID list for osxphotos’ --uuid-from-file
  const photos = await fs.readJson(photosPath);
  const uuidsFile = path.join(imagesDir, "uuids.txt");

  await fs.ensureDir(imagesDir);
  await fs.writeFile(uuidsFile, photos.map((p) => p.uuid).join("\n"), "utf8");

  // 2.  Export with a UTC‑normalised filename template
  //     {created|utc|strftime,"%Y%m%dT%H%M%S%fZ"} → 20250531T174503000123Z
  const filenameTemplate =
    '{created|utc|strftime,"%Y%m%dT%H%M%S%fZ"}-{original_name}';

  const cmd = `"${osxphotosPath}" export "${imagesDir}" \
--uuid-from-file "${uuidsFile}" \
--filename '${filenameTemplate}' \
--convert-to-jpeg --jpeg-ext jpg`;

  await execCommand(cmd, "osxphotos image export failed:");
}
