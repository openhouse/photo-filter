import fs from "fs-extra";
import path from "path";

const BUSY_CODES = new Set(["EBUSY", "ETXTBSY"]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameDevice(srcStat, destStat) {
  if (!srcStat || !destStat) return false;
  return srcStat.dev === destStat.dev;
}

async function statOptional(p) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

export async function cloneFile(src, dest, { logger, skipIfExists = false } = {}) {
  const log = (level, message, extra = {}) => {
    if (!logger) return;
    const fn = typeof logger[level] === "function" ? logger[level] : null;
    if (fn) fn(message, extra);
  };

  await fs.ensureDir(path.dirname(dest));

  if (skipIfExists && (await fs.pathExists(dest))) {
    log("info", "cloneFile: destination already exists", { src, dest });
    return "skip";
  }

  const srcStat = await statOptional(src);
  if (!srcStat) {
    const err = new Error(`Source not found for clone: ${src}`);
    err.code = "ENOENT";
    throw err;
  }

  const destParent = path.dirname(dest);
  const destParentStat = await statOptional(destParent);

  if (await fs.pathExists(dest)) {
    try {
      await fs.remove(dest);
    } catch (err) {
      log("warn", "cloneFile: failed to remove destination", {
        src,
        dest,
        code: err?.code,
        errno: err?.errno,
        message: err?.message,
      });
      throw err;
    }
  }

  try {
    await copyWithRetry(() =>
      fs.copyFile(src, dest, fs.constants.COPYFILE_FICLONE),
    );
    return await logMethod(log, src, dest, "clone");
  } catch (err) {
    if (err.code !== "ENOTSUP" && err.code !== "EXDEV" && err.errno !== 95) {
      log("warn", "cloneFile: COPYFILE_FICLONE failed", {
        src,
        dest,
        code: err.code,
        errno: err.errno,
      });
    }
  }

  if (sameDevice(srcStat, destParentStat)) {
    try {
      await copyWithRetry(() => fs.link(src, dest));
      return await logMethod(log, src, dest, "link");
    } catch (err) {
      if (err.code !== "EXDEV") {
        log("warn", "cloneFile: hard link failed", {
          src,
          dest,
          code: err.code,
          errno: err.errno,
        });
      }
    }
  } else {
    log("warn", "cloneFile: cross-device; falling back to copy", { src, dest });
  }

  const tempName = `${path.basename(dest)}.tmp-${process.pid}-${
    Math.random().toString(16).slice(2)
  }`;
  const tempPath = path.join(path.dirname(dest), tempName);
  try {
    await fs.copyFile(src, tempPath);
    await fs.chmod(tempPath, srcStat.mode).catch((err) => {
      log("warn", "cloneFile: failed to chmod temp copy", {
        src,
        dest,
        tempPath,
        code: err?.code,
        errno: err?.errno,
      });
    });
    await fs
      .utimes(tempPath, srcStat.atime, srcStat.mtime)
      .catch((err) => {
        log("warn", "cloneFile: failed to preserve timestamps", {
          src,
          dest,
          tempPath,
          code: err?.code,
          errno: err?.errno,
        });
      });
    await fs.rename(tempPath, dest);
  } catch (err) {
    await fs.remove(tempPath).catch(() => {});
    throw err;
  }

  return await logMethod(log, src, dest, "copy");
}

async function copyWithRetry(fn) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === 0 && BUSY_CODES.has(err?.code)) {
        attempt += 1;
        await delay(50);
        continue;
      }
      throw err;
    }
  }
}

async function logMethod(log, src, dest, method) {
  const size = (await fs.stat(dest)).size;
  log("info", "cloneFile: materialized image", {
    src,
    dest,
    method,
    size,
  });
  return method;
}
