// ./utils/exec-command.js

import { spawn } from "child_process";

// Helper function to execute shell commands
export function execCommand(command, errorMessage) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command:\n${command}`);

    const child = spawn(command, {
      stdio: "inherit",
      shell: true,
      env: process.env, // Ensure the environment variables are passed
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${errorMessage} Exit code: ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(new Error(`${errorMessage} ${error.message}`));
    });
  });
}
