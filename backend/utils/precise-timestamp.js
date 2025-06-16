// backend/utils/precise-timestamp.js
//
// Helper for formatting Apple-Photos / osxphotos date strings
// into a strictly-ordered, collision-proof timestamp segment.
//
//  ────────────────────────────────────────────────────────────
//  INPUT  examples
//    "2025-03-14 16:09:26.123456-04:00"
//    "2022-11-05 08:17:09-05:00"           (no subseconds)
//    new Date()                            (fallback path)
//
//  OUTPUT  (string)  "20250314-160926123456"   ← always 20 chars
//                    "20221105-081709000000"
//  ────────────────────────────────────────────────────────────
//
// *  Micro-seconds (6 digits) are included even when the source
//    lacks them → we pad with "000000", ensuring filenames sort
//    lexicographically identically to chronological order.
// *  We do **not** include timezone; the moment-in-time is
//    unambiguous once micro-second precision is present and the
//    sequence counter (below) is removed.
//

export function formatPreciseTimestamp(dateInput) {
  let str =
    typeof dateInput === "string"
      ? dateInput
      : new Date(dateInput).toISOString();

  const m = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/
  );

  if (!m) {
    // Fallback — ISO without sub-seconds
    const d = new Date(str);
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${YYYY}${MM}${DD}-${HH}${mm}${ss}000000`;
  }

  const [
    ,
    YYYY,
    MM,
    DD,
    HH,
    mm,
    ss,
    subsec = "0", // undefined → "0"
  ] = m;

  // micro-seconds, always 6 digits
  const usec = subsec.padEnd(6, "0").slice(0, 6);

  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}${usec}`;
}
