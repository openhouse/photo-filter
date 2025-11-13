import "./load-env.js";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { libraryRelativePath } from "../utils/exported-filename.js";

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

function resolveSafeRoot(envVar, defaultAbs, explicitPath) {
  const raw = explicitPath ?? process.env[envVar];
  const requested = path.resolve(raw || defaultAbs);
  if (isICloudPath(requested) && process.env.PF_ALLOW_ICLOUD_PATH !== "1") {
    throw new Error(
      `${envVar} points inside iCloud Drive; choose a local, non-synced path: ${requested}`
    );
  }
  return requested;
}

// Defaults: safe local, not synced
const DEFAULT_LOCAL_ROOT = process.env.DEFAULT_LOCAL_ROOT
  ? path.resolve(process.env.DEFAULT_LOCAL_ROOT)
  : "/Users/Shared/photo-filter-local";

export const LIBRARY_DIR_TEMPLATE_DEFAULT =
  "{created.utc.year}/{created.utc.mm}/{created.utc.dd}";

function stripEnclosingQuotes(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const starts = trimmed[0];
  const ends = trimmed[trimmed.length - 1];
  if ((starts === '"' && ends === '"') || (starts === "'" && ends === "'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getLocalRoot() {
  for (const key of ["PF_LOCAL_ROOT", "PF_MEDIA_ROOT"]) {
    if (process.env[key]) {
      return resolveSafeRoot(key, DEFAULT_LOCAL_ROOT, process.env[key]);
    }
  }
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

export function getLibraryRoot() {
  const explicit = process.env.PF_LIBRARY_ROOT;
  if (explicit) return resolveSafeRoot("PF_LIBRARY_ROOT", explicit);
  return path.join(getLocalRoot(), "library");
}

export function getLibraryDirTemplate() {
  const raw = process.env.PF_LIBRARY_DIR_TEMPLATE;
  if (!raw) return LIBRARY_DIR_TEMPLATE_DEFAULT;
  const trimmed = stripEnclosingQuotes(raw.trim());
  return trimmed || LIBRARY_DIR_TEMPLATE_DEFAULT;
}

export function getLibraryExportDbPath() {
  return path.join(getLibraryRoot(), ".osxphotos_export.db");
}

export function getLibraryPathForExportedName(exportedName) {
  if (!exportedName) return null;
  const relative = libraryRelativePath(exportedName, getLibraryDirTemplate());
  if (relative) {
    return path.join(getLibraryRoot(), relative, exportedName);
  }
  return path.join(getLibraryRoot(), exportedName);
}

async function ensureWritable(dir, label) {
  try {
    await fs.ensureDir(dir);
    await fs.access(dir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    console.error(`Storage root '${label}' is not accessible`, {
      path: dir,
      code: err?.code,
      errno: err?.errno,
      message: err?.message,
    });
    process.exit(1);
  }
}

export async function ensureRoots() {
  await ensureWritable(getLocalRoot(), "localRoot");
  await ensureWritable(getExportRoot(), "exportRoot");
  await ensureWritable(getLibraryRoot(), "libraryRoot");
}
