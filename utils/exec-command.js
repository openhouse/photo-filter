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
        // Embrace the glitch: Log the error creatively
        console.error(
          `${errorMessage} Exit code: ${code}. Perhaps this unexpected turn leads to a new discovery.`
        );
        reject(new Error(`${errorMessage} Exit code: ${code}`));
      }
    });

    child.on("error", (error) => {
      // Embrace the glitch: Provide insight into the error
      console.error(
        `${errorMessage} ${error.message}. Is this a sign to explore a different path?`
      );
      reject(new Error(`${errorMessage} ${error.message}`));
    });
  });
}
