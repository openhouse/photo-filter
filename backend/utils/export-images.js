// backend/utils/export-images.js

import fs from "fs-extra";
import path from "path";
import { execCommand } from "./exec-command.js";

/**
 * Export images using osxphotos for a given album.
 * @param {string} osxphotosPath - Path to the osxphotos executable in the virtualenv.
 * @param {string} albumUUID - The UUID of the album to export.
 * @param {string} imagesDir - The directory to which images will be exported.
 * @param {string} photosPath - The path to the photos.json file.
 */
export async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // Read photo UUIDs from photos.json
  const photosData = await fs.readJson(photosPath);
  const uuids = photosData.map((photo) => photo.uuid).join("\n");
  const uuidsFilePath = path.join(imagesDir, "uuids.txt");

  // Ensure imagesDir exists
  await fs.ensureDir(imagesDir);

  // Write UUIDs to uuids.txt
  await fs.writeFile(uuidsFilePath, uuids, "utf-8");

  // Use a date/time prefix and original_name directly via osxphotos template:
  // {created.strftime,%Y%m%d-%H%M%S}-{original_name}
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{created.strftime,%Y%m%d-%H%M%S}-{original_name}" --convert-to-jpeg --jpeg-ext jpg`;

  console.log(`Executing command:\n${commandImages}`);
  await execCommand(commandImages, "Error exporting album images:");
}

/**
 * Safely get a nested property from an object.
 * @param {object} obj - The object to retrieve the property from.
 * @param {string} propertyPath - The dot-separated path (e.g. "score.overall").
 * @returns {*} - The property value or null if not found.
 */
export function getNestedProperty(obj, propertyPath) {
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}
