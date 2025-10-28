// ./utils/run-python-script.js

import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";

const STDERR_TAIL_MAX = 256 * 1024; // 256 KiB

/**
 * Run a Python script and stream stdout directly to `outputPath`.
 *
 * @param {string} pythonPath path to the Python executable
 * @param {string} scriptPath path to the Python script
 * @param {string[]} args arguments passed to the script
 * @param {string} outputPath file path that will receive streamed stdout
 * @param {{ albumUUID?: string, exportBase?: string, logPath?: string }} options
 *   Optional metadata so we can persist logs alongside album exports.
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

  const { albumUUID, exportBase, logPath: explicitLogPath } = options;
  let logStream = null;
  let logPath = explicitLogPath;

  if (!logPath && albumUUID && exportBase) {
    const logDir = path.join(exportBase, "logs");
    await fs.ensureDir(logDir);
    logPath = path.join(logDir, `export-${albumUUID}.log`);
  }

  if (logPath) {
    await fs.ensureDir(path.dirname(logPath));
    logStream = fs.createWriteStream(logPath, { flags: "a" });
    logStream.write(
      `[${new Date().toISOString()}] Running ${path.basename(scriptPath)} ${args.join(
        " ",
      )}\n`,
    );
  }

  const child = spawn(pythonPath, [scriptPath, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  console.log(
    `Executing command:\n"${pythonPath}" "${scriptPath}"${
      args.length ? " " + args.join(" ") : ""
    }`,
  );

  const out = fs.createWriteStream(tmpPath, { flags: "w" });
  child.stdout.pipe(out);

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
    if (logStream) {
      logStream.write(chunk);
    }
  });

  return new Promise((resolve, reject) => {
    child.on("error", (error) => {
      out.destroy();
      fs.remove(tmpPath).catch(() => {});
      if (logStream) {
        logStream.write(
          `[${new Date().toISOString()}] error: ${error.message}\n`,
        );
        logStream.end();
      }
      reject(error);
    });

    child.on("close", async (code, signal) => {
      try {
        await new Promise((resolveClose, rejectClose) => {
          out.end((err) => {
            if (err) {
              rejectClose(err);
            } else {
              resolveClose();
            }
          });
        });
      } catch (streamErr) {
        if (logStream) {
          logStream.write(
            `[${new Date().toISOString()}] error closing stdout stream: ${streamErr.message}\n`,
          );
          logStream.end();
        }
        await fs.remove(tmpPath).catch(() => {});
        reject(streamErr);
        return;
      }

      if (logStream) {
        logStream.write(
          `[${new Date().toISOString()}] exited with code ${code}${
            signal ? ` (signal ${signal})` : ""
          }\n`,
        );
        logStream.end();
      }

      if (code === 0) {
        try {
          await fs.move(tmpPath, outputPath, { overwrite: true });
          resolve({ logPath });
        } catch (mvErr) {
          reject(mvErr);
        }
        return;
      }

      await fs.remove(tmpPath).catch(() => {});
      const tail = errTail.toString("utf8").trim();
      const err = new Error(`Python export failed${tail ? `:\n${tail}` : ""}`);
      err.code = code;
      err.signal = signal;
      reject(err);
    });
  });
}
