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

  // Use {original_name} template to avoid double extensions
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --convert-to-jpeg --jpeg-ext jpg`;

  console.log(`Executing command:\n${commandImages}`);
  await execCommand(commandImages, "Error exporting album images:");
}

/**
 * Rename exported images to include a date/time prefix derived from the photo's `date` field.
 * @param {string} imagesDir - The directory containing the exported images.
 * @param {string} photosPath - The path to the photos.json file.
 */
export async function renameExportedImages(imagesDir, photosPath) {
  const photosData = await fs.readJson(photosPath);

  for (const photo of photosData) {
    const originalName = path.parse(photo.original_filename).name; // e.g., DSCF1191
    const photoDate = new Date(photo.date); // Parse the photo’s date field
    const formattedDate = formatPhotoDate(photoDate); // YYYYMMDD-HHMMSS
    const oldPath = path.join(imagesDir, `${originalName}.jpg`);

    if (await fs.pathExists(oldPath)) {
      let newFilename = `${formattedDate}-${originalName}.jpg`;
      let finalPath = path.join(imagesDir, newFilename);

      // Check for collisions
      let counter = 1;
      while (await fs.pathExists(finalPath)) {
        newFilename = `${formattedDate}-${originalName}-${counter}.jpg`;
        finalPath = path.join(imagesDir, newFilename);
        counter++;
      }

      await fs.rename(oldPath, finalPath);
      console.log(`Renamed ${originalName}.jpg to ${newFilename}`);
    } else {
      console.warn(`File not found for rename: ${oldPath}`);
    }
  }
}

/**
 * Format the photo date as YYYYMMDD-HHMMSS
 * @param {Date} dateObj - The date of the photo.
 * @returns {string} - The formatted date string.
 */
function formatPhotoDate(dateObj) {
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");
  const HH = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
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
