// ./utils/exec-command.js

import { spawn } from "child_process";

// Helper function to execute shell commands
export function execCommand(command, errorMessage) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command:\n${command}`);

    const child = spawn(command, {
      env: process.env,
      shell: true,
    });

    child.stdout.on("data", (data) => {
      console.log(`stdout:\n${data.toString()}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr:\n${data.toString()}`);
    });

    child.on("error", (error) => {
      console.error(`${errorMessage}\nError: ${error.message}`);
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${errorMessage}\nExit code: ${code}`));
      } else {
        resolve();
      }
    });
  });
}
