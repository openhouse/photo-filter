/**
 * precise‑timestamp.js
 * --------------------
 * Two related utilities that build micro‑second‑precise **UTC** stamps
 * used as filename prefixes.
 *
 *   • formatPreciseTimestamp(dateLike)
 *       └─ Robustly parses several Photos‑style date strings.
 *
 *   • utcTimestampForFile(filePath)
 *       └─ Reads EXIF (with exiftool‑vendored) and delegates to Luxon.
 *
 * Both return the canonical 27‑character form:
 *        YYYYMMDDTHHMMSSffffffZ
 * Example:
 *        20250531T174503000123Z
 */

import { exiftool } from "exiftool-vendored";
import { DateTime } from "luxon";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Date or one of Photos’ date string variants into our canonical
 * UTC stamp.  Accepts:
 *
 *   • ISO‑8601  →  2025‑05‑31T13:45:41‑06:00
 *   • SQL       →  2025‑05‑31 13:45:41‑06:00   (space instead of “T”)
 *   • EXIF      →  2025:05:31 13:45:41         (colon‑separated date, no TZ)
 *
 * @param {string|Date} dateLike
 * @returns {string} e.g. "20250531T174503123000Z"
 */
export function formatPreciseTimestamp(dateLike) {
  // Fast path: Date object (no microseconds beyond ms available)
  if (dateLike instanceof Date) {
    const dt = DateTime.fromJSDate(dateLike, { zone: "utc" });
    const micro = String(dateLike.getUTCMilliseconds() * 1000).padStart(
      6,
      "0"
    );
    return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss") + micro + "Z";
  }

  if (typeof dateLike !== "string") {
    throw new TypeError(`formatPreciseTimestamp(): expected Date or string`);
  }

  let src = dateLike.trim();

  // 1) Capture fractional seconds (up to 6) before parsing to avoid Luxon rounding
  let micro = "000000";
  const frac = src.match(/\.(\d{1,6})/); // e.g. ".924927" or ".160000"
  if (frac) {
    micro = (frac[1] + "000000").slice(0, 6); // pad/truncate to 6
    src = src.replace(/\.(\d{1,6})/, ""); // remove fraction for the parser
  }

  // 2) Support offsets with seconds, e.g. "+00:09:21"
  let tzSeconds = 0;
  const m = src.match(/([+-]\d{2}:\d{2}):(\d{2})$/);
  if (m) {
    tzSeconds = (m[1].startsWith("+") ? 1 : -1) * parseInt(m[2], 10);
    src = src.replace(m[0], m[1]); // strip ":SS" so Luxon can parse
  }

  // 3) Parse with zone preserved
  let dt = DateTime.fromISO(src, { setZone: true });
  if (!dt.isValid) dt = DateTime.fromSQL(src, { setZone: true });
  if (!dt.isValid)
    dt = DateTime.fromFormat(src, "yyyy:MM:dd HH:mm:ss", { zone: "local" });
  if (!dt.isValid)
    throw new Error(`formatPreciseTimestamp(): invalid input (“${dateLike}”)`);

  if (tzSeconds) dt = dt.plus({ seconds: -tzSeconds });

  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss") + micro + "Z";
}

// ---------------------------------------------------------------------------
// utcTimestampForFile()  – unchanged
// ---------------------------------------------------------------------------

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
