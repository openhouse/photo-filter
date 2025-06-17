/**
 * precise‑timestamp.js
 * --------------------
 * Two related utilities that build micro‑second‑precise **UTC** stamps
 * used as filename prefixes.
 *
 *   • formatPreciseTimestamp(dateLike)
 *       └─ Pure helper for an ISO string or JS Date.
 *
 *   • utcTimestampForFile(filePath)
 *       └─ Reads EXIF (with exiftool‑vendored) and delegates to Luxon.
 *
 * Both return the canonical 27‑character form:
 *     YYYYMMDDTHHMMSSffffffZ
 * Example:
 *     20250531T174503000123Z
 */

import { exiftool } from "exiftool-vendored";
import { DateTime } from "luxon";

/**
 * Convert a Date or ISO‑8601 string into our canonical UTC stamp.
 *
 * @param {string|Date} dateLike
 * @returns {string} e.g. "20250531T174503123000Z"
 */
export function formatPreciseTimestamp(dateLike) {
  let dt;

  if (dateLike instanceof Date) {
    dt = DateTime.fromJSDate(dateLike, { zone: "utc" });
  } else if (typeof dateLike === "string") {
    // Let Luxon respect any embedded offset; fall back to local().
    dt = DateTime.fromISO(dateLike, { setZone: true }).toUTC();
  } else {
    throw new TypeError(
      `formatPreciseTimestamp(): expected Date or string, got ${typeof dateLike}`
    );
  }

  if (!dt.isValid) {
    throw new Error(
      `formatPreciseTimestamp(): invalid input (${dt.invalidReason})`
    );
  }

  // Luxon gives millisecond precision; multiply to micro‑seconds.
  const micro = String(dt.millisecond * 1_000).padStart(6, "0");

  return dt.toFormat("yyyyLLdd'T'HHmmss") + micro + "Z";
}

/**
 * Read EXIF and build the canonical UTC timestamp.
 *
 * @param {string} filePath – absolute image path
 * @returns {Promise<string>}
 */
export async function utcTimestampForFile(filePath) {
  const tags = await exiftool.read(filePath);

  const base =
    tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate || null;
  if (!base) {
    throw new Error(`No date field in EXIF for ${filePath}`);
  }

  // Sub‑seconds → six digits
  const subsec = (
    (tags.SubSecTimeOriginal || tags.SubSecTime || "0").toString() + "000000"
  ).slice(0, 6);

  const offset = tags.OffsetTimeOriginal || tags.OffsetTime || null;

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
