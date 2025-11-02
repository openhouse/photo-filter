import path from "path";

function toComparable(name) {
  return path.basename(name).replace(/\.[^.]+$/, "").toLowerCase();
}

export function findExportedImageMatch(files, requestedName) {
  if (!Array.isArray(files) || files.length === 0) {
    return null;
  }

  const wantComparable = toComparable(requestedName);
  const dash = wantComparable.indexOf("-");
  if (dash < 0) {
    return null;
  }
  const wantSeconds = wantComparable.slice(0, dash).slice(0, 15);
  const wantTail = wantComparable.slice(dash + 1);

  for (const candidate of files) {
    const comparable = toComparable(candidate);
    const candidateDash = comparable.indexOf("-");
    if (candidateDash < 0) continue;
    const candidateSeconds = comparable.slice(0, candidateDash).slice(0, 15);
    if (candidateSeconds !== wantSeconds) continue;
    const candidateTail = comparable.slice(candidateDash + 1);

    if (
      candidateTail === wantTail ||
      candidateTail.startsWith(`${wantTail}-`) ||
      candidateTail.startsWith(`${wantTail} (`)
    ) {
      return candidate;
    }
    if (
      wantTail.startsWith(`${candidateTail}-`) ||
      wantTail.startsWith(`${candidateTail} (`)
    ) {
      return candidate;
    }
  }

  return null;
}

export default findExportedImageMatch;
