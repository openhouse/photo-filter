// backend/utils/precise-timestamp.js
//
// Convert a Photos / osxphotos date string (or a JS Date) into an
// always-20-character, micro-second-precise timestamp suitable for
// lexicographic sorting and collision-proof filenames.
//
//   INPUT EXAMPLES
//     "2025-03-14 16:09:26.123456-04:00"
//     "2022-11-05 08:17:09-05:00"         (no subseconds)
//     new Date()
//
//   OUTPUT
//     "20250314-160926123456"
//     "20221105-081709000000"
//
// * Time-zone is intentionally dropped — once micro-seconds are
//   present the sequence is unambiguous within a single library/export.
// * Sub-seconds are padded/truncated to exactly 6 digits.

export function formatPreciseTimestamp(dateInput) {
  // Normalise to string first
  const str =
    typeof dateInput === "string"
      ? dateInput
      : new Date(dateInput).toISOString(); // fallback for Date objects

  const m = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/
  );
  if (!m) {
    // Very unlikely, but defensive fallback for weird input
    const d = new Date(str);
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${YYYY}${MM}${DD}-${HH}${mm}${ss}000000`;
  }

  const [, YYYY, MM, DD, HH, mm, ss, subsec = ""] = m;

  // exactly 6 micro-second digits
  const usec = subsec.padEnd(6, "0").slice(0, 6);

  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}${usec}`;
}
