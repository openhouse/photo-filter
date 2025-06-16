/**
 * Build a micro‑second‑precise, **UTC** timestamp string for an image file.
 *
 * Result format:  YYYYMMDDTHHMMSSffffffZ   (always 20 chars + ‘Z’)
 * Example:        20250531T174503000123Z
 *
 * Logic
 *  1. Read EXIF with exiftool‑vendored (native binary, 100× faster than spawning CLI).
 *  2. Start with DateTimeOriginal (fallback: CreateDate, ModifyDate).
 *  3. Determine sub‑seconds, padding to 6 digits.
 *  4. Determine zone:
 *       • OffsetTimeOriginal, else OffsetTime, else default to local().
 *  5. Convert to UTC and format.
 */

import { exiftool } from "exiftool-vendored";
import { DateTime } from "luxon";

/**
 * @param {string} filePath – absolute path to an image
 * @returns {Promise<string>} UTC timestamp suitable for a filename prefix
 * @throws if DateTimeOriginal is missing / unparsable
 */
export async function utcTimestampForFile(filePath) {
  const tags = await exiftool.read(filePath);

  const base = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;

  if (!base) {
    throw new Error(`No date field in EXIF for ${filePath}`);
  }

  // Sub‑second – pad right then slice to exactly 6 chars
  const subsec = (
    (tags.SubSecTimeOriginal || tags.SubSecTime || "0").toString() + "000000"
  ).slice(0, 6);

  // EXIF stores offsets like "+01:00" or "-06:00"
  const offset = tags.OffsetTimeOriginal || tags.OffsetTime || null; // luxon 'null' == system local

  const dtLocal = DateTime.fromFormat(base, "yyyy:MM:dd HH:mm:ss", {
    zone: offset ?? "local",
  }).plus({ microseconds: Number(subsec) });

  if (!dtLocal.isValid) {
    throw new Error(
      `Invalid date in EXIF for ${filePath}: ${dtLocal.invalidExplanation}`
    );
  }

  return dtLocal.toUTC().toFormat("yyyyLLdd'T'HHmmss") + subsec + "Z";
}
