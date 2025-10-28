// ./utils/run-python-script.js

import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import { finished } from "stream/promises";

const STDERR_TAIL_MAX = 256 * 1024; // 256 KiB

/**
 * Run a Python script and stream stdout directly to `outputPath`.
 *
 * @param {string} pythonPath path to the Python executable
 * @param {string} scriptPath path to the Python script
 * @param {string[]} args arguments passed to the script
 * @param {string} outputPath file path that will receive streamed stdout
 * @param {{
 *   albumUUID?: string,
 *   exportBase?: string,
 *   logPath?: string,
 *   logStream?: import("stream").Writable,
 *   appendLog?: boolean,
 * }} options Optional metadata so we can persist logs alongside album exports.
 */
export async function runPythonScript(
  pythonPath,
  scriptPath,
  args = [],
  outputPath,
  options = {},
) {
  if (!outputPath) {
    throw new Error(
      "runPythonScript requires an outputPath to stream stdout into",
    );
  }

  await fs.ensureDir(path.dirname(outputPath));
  const tmpPath = `${outputPath}.tmp`;

  await fs.remove(tmpPath).catch(() => {});

  const {
    albumUUID,
    exportBase,
    logPath: explicitLogPath,
    logStream: providedLogStream,
    appendLog = true,
  } = options;

  let logStream = providedLogStream || null;
  let logPath = explicitLogPath;
  let ownsLogStream = false;

  if (!logPath && albumUUID && exportBase) {
    const logDir = path.join(exportBase, "logs");
    await fs.ensureDir(logDir);
    logPath = path.join(logDir, `export-${albumUUID}.log`);
  }

  if (!logStream && logPath) {
    await fs.ensureDir(path.dirname(logPath));
    logStream = fs.createWriteStream(logPath, { flags: appendLog ? "a" : "w" });
    ownsLogStream = true;
  }

  const logMessage = (message) => {
    if (!logStream || logStream.destroyed || logStream.writableEnded) {
      return;
    }
    logStream.write(`[${new Date().toISOString()}] ${message}\n`);
  };

  if (logStream) {
    logMessage(
      `Running ${path.basename(scriptPath)}${
        args.length ? ` ${args.join(" ")}` : ""
      }`,
    );
  }

  const spawnArgs = ["-u", scriptPath, ...args];

  const child = spawn(pythonPath, spawnArgs, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const printableCommand = [pythonPath, ...spawnArgs]
    .map((segment) => `"${segment}"`)
    .join(" ");
  console.log(`Executing command:\n${printableCommand}`);

  const stdoutStream = fs.createWriteStream(tmpPath, { flags: "w" });
  child.stdout.pipe(stdoutStream);

  let stdoutStreamError = null;
  const stdoutFinished = finished(stdoutStream).catch((err) => {
    stdoutStreamError = err;
  });

  let errTail = Buffer.alloc(0);

  const appendErrorTail = (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    errTail = errTail.length ? Buffer.concat([errTail, buf]) : Buffer.from(buf);
    if (errTail.length > STDERR_TAIL_MAX) {
      errTail = errTail.slice(-STDERR_TAIL_MAX);
    }
  };

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    appendErrorTail(chunk);
    if (logStream && !logStream.destroyed && !logStream.writableEnded) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      logStream.write(buf);
    }
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const closeOwnedLogStream = async () => {
      if (!ownsLogStream || !logStream) {
        return;
      }
      if (logStream.destroyed || logStream.writableEnded) {
        return;
      }
      await new Promise((resolveClose) => {
        logStream.end(() => resolveClose());
      });
    };

    child.on("error", async (error) => {
      if (!stdoutStream.destroyed) {
        stdoutStream.destroy(error);
      }
      await stdoutFinished.catch(() => {});
      await fs.remove(tmpPath).catch(() => {});
      if (logStream) {
        logMessage(`error: ${error.message}`);
      }
      await closeOwnedLogStream().catch(() => {});
      rejectOnce(error);
    });

    child.on("close", async (code, signal) => {
      await stdoutFinished;

      if (stdoutStreamError) {
        if (logStream) {
          logMessage(
            `error closing stdout stream: ${stdoutStreamError.message}`,
          );
        }
        await fs.remove(tmpPath).catch(() => {});
        await closeOwnedLogStream().catch(() => {});
        rejectOnce(stdoutStreamError);
        return;
      }

      if (logStream) {
        logMessage(
          `python exited with code ${code}${
            signal ? ` (signal ${signal})` : ""
          }`,
        );
      }

      if (code === 0) {
        try {
          await fs.move(tmpPath, outputPath, { overwrite: true });
          await closeOwnedLogStream().catch(() => {});
          resolveOnce({ logPath });
        } catch (mvErr) {
          await closeOwnedLogStream().catch(() => {});
          rejectOnce(mvErr);
        }
        return;
      }

      await fs.remove(tmpPath).catch(() => {});
      const tail = errTail.toString("utf8").trim();
      const err = new Error(`Python export failed${tail ? `:\n${tail}` : ""}`);
      err.code = code;
      err.signal = signal;
      await closeOwnedLogStream().catch(() => {});
      rejectOnce(err);
    });
  });
}
