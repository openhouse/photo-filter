import path from "path";
import fs from "fs-extra";

const COLLISION_SUFFIXES = buildCollisionSuffixes();

export async function resolveLibraryCandidate(libraryPath, exportedName) {
  if (!libraryPath) {
    return null;
  }

  if (await fs.pathExists(libraryPath)) {
    return libraryPath;
  }

  const dir = path.dirname(libraryPath);
  const ext = path.extname(exportedName);
  const base = path.basename(exportedName, ext);

  for (const suffix of COLLISION_SUFFIXES) {
    const candidate = path.join(dir, `${base}${suffix}${ext}`);
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function buildCollisionSuffixes() {
  const suffixes = [];
  for (let i = 1; i <= 9; i += 1) {
    suffixes.push(`-${i}`);
    suffixes.push(` (${i})`);
  }
  return suffixes;
}
