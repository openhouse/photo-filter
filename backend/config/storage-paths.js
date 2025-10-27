import path from "path";
import fs from "fs-extra";
import os from "os";

/**
 * Return true if the realpath of `p` resolves inside iCloud Drive.
 */
export function isICloudPath(p) {
  const home = os.homedir();
  const icloudRoot = path.resolve(
    path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
  );

  let real;
  try {
    real = fs.realpathSync.native
      ? fs.realpathSync.native(p)
      : fs.realpathSync(p);
  } catch {
    // If it doesn't exist yet, test the parent dir instead.
    const parent = path.resolve(path.join(p, ".."));
    real = fs.realpathSync.native
      ? fs.realpathSync.native(parent)
      : fs.realpathSync(parent);
  }

  const rel = path.relative(icloudRoot, real);
  return !rel || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveSafeRoot(envVar, defaultAbs) {
  const requested = path.resolve(process.env[envVar] || defaultAbs);
  if (isICloudPath(requested) && process.env.PF_ALLOW_ICLOUD_PATH !== "1") {
    throw new Error(
      `${envVar} points inside iCloud Drive; choose a local, non-synced path: ${requested}`
    );
  }
  return requested;
}

// Defaults: safe local, not synced
const DEFAULT_LOCAL_ROOT = "/Users/Shared/photo-filter-local";

export function getLocalRoot() {
  return resolveSafeRoot("PF_LOCAL_ROOT", DEFAULT_LOCAL_ROOT);
}

export function getExportRoot() {
  // If PF_EXPORT_ROOT is not set, nest exports under local root
  const explicit = process.env.PF_EXPORT_ROOT;
  if (explicit) return resolveSafeRoot("PF_EXPORT_ROOT", explicit);
  return path.join(getLocalRoot(), "exports");
}

export function getAlbumImagesDir(albumUUID) {
  return path.join(getLocalRoot(), "albums", albumUUID, "images");
}

export function getExportBase(albumUUID) {
  return path.join(getExportRoot(), albumUUID);
}

export async function ensureRoots() {
  await fs.ensureDir(getLocalRoot());
  await fs.ensureDir(getExportRoot());
}
