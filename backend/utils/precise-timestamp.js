/**
 * precise‑timestamp.js
 * --------------------
 * Build micro‑second‑precise UTC stamps for filenames.
 *
 *   • formatPreciseTimestamp(dateLike)
 *   • utcTimestampForFile(filePath)
 *
 * Both return:  YYYYMMDDTHHMMSSffffffZ   (27 chars)
 * Example:      20250531T174503000123Z
 */

import { exiftool } from "exiftool-vendored";
import { DateTime } from "luxon";

/*───────────────────────────────────────────────────────────────────────────*/
/* Internal helpers                                                         */
/*───────────────────────────────────────────────────────────────────────────*/

/**
 * Replace the first space between date and time with “T” so
 * `yyyy‑MM‑dd HH:mm:ss` becomes ISO‑like for Luxon.
 */
function normaliseIsoLike(str) {
  const i = str.indexOf(" ");
  return i === -1 ? str : str.slice(0, i) + "T" + str.slice(i + 1);
}

/** Try several parsing strategies until one succeeds. */
function parseLooseIso(raw) {
  // 1) quick normalisation + fromISO
  let dt = DateTime.fromISO(normaliseIsoLike(raw), { setZone: true });
  if (dt.isValid) return dt;

  // 2) explicit fallback formats we’ve seen in osxphotos exports
  const formats = [
    "yyyy-MM-dd HH:mm:ss.SSSSSSZZ",
    "yyyy-MM-dd HH:mm:ss.SSSSSZZ",
    "yyyy-MM-dd HH:mm:ssZZ",
  ];

  for (const f of formats) {
    dt = DateTime.fromFormat(raw, f, { setZone: true });
    if (dt.isValid) return dt;
  }
  return dt; // still invalid – caller will handle
}

/*───────────────────────────────────────────────────────────────────────────*/
/* Public API                                                               */
/*───────────────────────────────────────────────────────────────────────────*/

/**
 * @param {string|Date} dateLike – JS Date or ISO‑ish string
 * @returns {string} canonical UTC stamp (YYYYMMDDTHHMMSSffffffZ)
 */
export function formatPreciseTimestamp(dateLike) {
  let dt;

  if (dateLike instanceof Date) {
    dt = DateTime.fromJSDate(dateLike, { zone: "utc" });
  } else if (typeof dateLike === "string") {
    dt = parseLooseIso(dateLike).toUTC();
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

  // Luxon supplies millisecond precision → pad to six‑digit micro‑seconds.
  const micro = String(dt.millisecond * 1_000).padStart(6, "0");
  return dt.toFormat("yyyyLLdd'T'HHmmss") + micro + "Z";
}

/**
 * Read EXIF timestamps and convert to canonical UTC stamp.
 *
 * @param {string} filePath – absolute image path
 * @returns {Promise<string>}
 */
export async function utcTimestampForFile(filePath) {
  const tags = await exiftool.read(filePath);

  const base =
    tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate || null;
  if (!base) throw new Error(`No date field in EXIF for ${filePath}`);

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
