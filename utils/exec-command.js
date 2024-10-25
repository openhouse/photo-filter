// ./utils/exec-command.js

import { spawn } from "child_process";

// Helper function to execute shell commands and capture stdout
export function execCommand(command, errorMessage) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command:\n${command}`);

    let stdoutData = "";
    let stderrData = "";

    const child = spawn(command, {
      shell: true,
      env: process.env, // Ensure the environment variables are passed
    });

    child.stdout.on("data", (data) => {
      stdoutData += data;
    });

    child.stderr.on("data", (data) => {
      stderrData += data;
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: stdoutData, stderr: stderrData });
      } else {
        reject(
          new Error(
            `${errorMessage} Exit code: ${code}\n${stderrData || stdoutData}`
          )
        );
      }
    });

    child.on("error", (error) => {
      reject(new Error(`${errorMessage} ${error.message}`));
    });
  });
}
