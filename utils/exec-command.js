// ./utils/exec-command.js

import { exec } from "child_process";

// Helper function to execute shell commands
export function execCommand(command, errorMessage) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command:\n${command}`);

    exec(command, { env: process.env }, (error, stdout, stderr) => {
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
      resolve();
    });
  });
}
