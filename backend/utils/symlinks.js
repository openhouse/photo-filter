import fs from "fs-extra";
import path from "path";

const logged = new Set();

function logOnce(logger, level, key, message, meta) {
  if (logged.has(key)) {
    return;
  }
  logged.add(key);
  if (typeof logger?.[level] === "function") {
    logger[level](message, meta);
  } else if (typeof logger?.log === "function") {
    logger.log(message, meta);
  }
}

export async function ensureLegacySymlink(imagesDir, linkPath, { logger = console } = {}) {
  if (!imagesDir || !linkPath) {
    throw new Error("ensureLegacySymlink requires imagesDir and linkPath");
  }

  if (process.env.PF_SKIP_LEGACY_SYMLINK === "1") {
    return;
  }

  const resolvedImagesDir = path.resolve(imagesDir);
  const linkDir = path.dirname(linkPath);
  const relativeTarget = path.relative(linkDir, resolvedImagesDir) || ".";

  try {
    await fs.ensureDir(linkDir);
  } catch (err) {
    logOnce(
      logger,
      "warn",
      `ensureLegacySymlink:ensureDir:${linkDir}`,
      "ensureLegacySymlink: unable to ensure parent directory",
      { err }
    );
    return;
  }

  let stat = null;
  try {
    stat = await fs.lstat(linkPath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      logOnce(
        logger,
        "warn",
        `ensureLegacySymlink:lstat:${linkPath}:${err?.code}`,
        "ensureLegacySymlink: unable to stat link",
        { code: err?.code, errno: err?.errno, linkPath }
      );
      return;
    }
  }

  if (stat) {
    if (stat.isSymbolicLink()) {
      const currentTarget = await fs.readlink(linkPath).catch(() => null);
      if (currentTarget) {
        const resolvedCurrent = path.resolve(linkDir, currentTarget);
        if (resolvedCurrent === resolvedImagesDir) {
          return;
        }
      }
      try {
        await fs.unlink(linkPath);
      } catch (err) {
        logOnce(
          logger,
          "warn",
          `ensureLegacySymlink:unlink:${linkPath}:${err?.code}`,
          "ensureLegacySymlink: unable to replace existing symlink",
          { code: err?.code, errno: err?.errno, linkPath }
        );
        return;
      }
    } else {
      logOnce(
        logger,
        "warn",
        `ensureLegacySymlink:exists:${linkPath}`,
        "ensureLegacySymlink: path exists and is not a symlink; skipping",
        { linkPath }
      );
      return;
    }
  }

  try {
    await fs.symlink(relativeTarget, linkPath, "dir");
  } catch (err) {
    if (["EEXIST", "EISDIR", "EPERM", "ENOENT"].includes(err?.code)) {
      logOnce(
        logger,
        "warn",
        `ensureLegacySymlink:benign:${linkPath}:${err?.code}`,
        "ensureLegacySymlink: benign",
        { code: err?.code, errno: err?.errno, linkPath }
      );
      return;
    }
    logOnce(
      logger,
      "warn",
      `ensureLegacySymlink:error:${linkPath}:${err?.code}`,
      "ensureLegacySymlink: non-fatal error",
      { code: err?.code, errno: err?.errno, linkPath, err }
    );
  }
}
