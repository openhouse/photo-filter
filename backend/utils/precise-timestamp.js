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
  let dt;

  // 1. Already a Date object ------------------------------------------------
  if (dateLike instanceof Date) {
    dt = DateTime.fromJSDate(dateLike, { zone: "utc" });
  } else if (typeof dateLike === "string") {
    // 2. ISO 8601 -----------------------------------------------------------
    dt = DateTime.fromISO(dateLike, { setZone: true });

    // 3. SQL format  (Photos DB default)  -----------------------------------
    if (!dt.isValid) {
      dt = DateTime.fromSQL(dateLike, { setZone: true });
    }

    // 4. EXIF “YYYY:MM:DD HH:MM:SS”  ----------------------------------------
    if (!dt.isValid) {
      dt = DateTime.fromFormat(
        dateLike,
        "yyyy:MM:dd HH:mm:ss",
        { zone: "local" } // assume local if no offset supplied
      );
    }

    // 5. As a last resort let JS Date try -----------------------------------
    if (!dt.isValid) {
      const jsDate = new Date(dateLike);
      if (!isNaN(jsDate.getTime())) {
        dt = DateTime.fromJSDate(jsDate, { zone: "utc" });
      }
    }

    // (if still invalid we fall through and raise)
  } else {
    throw new TypeError(
      `formatPreciseTimestamp(): expected Date or string, got ${typeof dateLike}`
    );
  }

  if (!dt.isValid) {
    throw new Error(
      `formatPreciseTimestamp(): invalid input (“${dateLike}” – ${dt.invalidReason})`
    );
  }

  // Luxon gives millisecond precision; multiply to micro‑seconds.
  const micro = String(dt.millisecond * 1_000).padStart(6, "0");

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
