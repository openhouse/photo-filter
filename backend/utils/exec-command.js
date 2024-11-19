// ./utils/exec-command.js

import { exec } from "child_process";

// Helper function to execute shell commands
export function execCommand(command, errorMessage) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command:\n${command}`);

    exec(
      command,
      { env: process.env, maxBuffer: 1024 * 1024 * 1024 * 2 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`${errorMessage}\nError: ${error.message}`);
          if (stderr) {
            console.error(`stderr:\n${stderr}`);
          }
          reject(error);
          return;
        }
        if (stdout) {
          console.log(`stdout:\n${stdout}`);
        }
        if (stderr) {
          console.error(`stderr:\n${stderr}`);
        }
        resolve({ stdout, stderr });
      }
    );
  });
}
