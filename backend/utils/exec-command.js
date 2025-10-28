// ./utils/exec-command.js

import { spawn } from "child_process";

/**
 * Execute a command while streaming output to this process. Accepts either a
 * shell command string or an array of [command, ...args].
 *
 * @param {string|string[]} cmdOrArgs
 * @param {string} errorMessage
 * @param {{
 *   cwd?: string,
 *   env?: NodeJS.ProcessEnv,
 *   logStream?: import("stream").Writable,
 * }} options
 */
export function execCommand(
  cmdOrArgs,
  errorMessage = "Command failed:",
  options = {},
) {
  return new Promise((resolve, reject) => {
    let command;
    let args = [];
    let useShell = false;

    if (Array.isArray(cmdOrArgs)) {
      [command, ...args] = cmdOrArgs;
    } else {
      command = cmdOrArgs;
      useShell = true;
    }

    const { cwd, env, logStream } = options;
    const child = spawn(command, args, {
      shell: useShell,
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const printable = Array.isArray(cmdOrArgs)
      ? [command, ...args].join(" ")
      : command;
    console.log(`Executing command:\n${printable}`);

    const logMessage = (message) => {
      if (!logStream || logStream.destroyed || logStream.writableEnded) {
        return;
      }
      logStream.write(`[${new Date().toISOString()}] ${message}\n`);
    };

    if (logStream) {
      logMessage(`Running ${printable}`);
    }

    let stderrBuf = Buffer.alloc(0);

    const appendStderr = (chunk) => {
      stderrBuf = Buffer.concat([stderrBuf, Buffer.from(chunk)]);
      if (stderrBuf.length > 256 * 1024) {
        stderrBuf = stderrBuf.slice(-256 * 1024);
      }
    };

    child.stdout.on("data", (data) => {
      process.stdout.write(data);
      if (logStream && !logStream.destroyed && !logStream.writableEnded) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        logStream.write(buf);
      }
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data);
      appendStderr(data);
      if (logStream && !logStream.destroyed && !logStream.writableEnded) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        logStream.write(buf);
      }
    });

    child.on("error", (err) => {
      if (logStream) {
        logMessage(`error: ${err.message}`);
      }
      reject(err);
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        if (logStream) {
          logMessage(`command exited with code ${code}`);
        }
        resolve();
        return;
      }
      const tail = stderrBuf.toString("utf8").trim();
      const message = tail ? `${errorMessage}\n${tail}` : errorMessage;
      const error = new Error(message);
      error.code = code;
      error.signal = signal;
      if (logStream) {
        logMessage(
          `command failed with code ${code}${
            signal ? ` (signal ${signal})` : ""
          }`,
        );
      }
      reject(error);
    });
  });
}
