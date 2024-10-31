// ./utils/run-python-script.js

import { exec } from "child_process";
import fs from "fs-extra";

export async function runPythonScript(
  pythonPath,
  scriptPath,
  args = [],
  outputPath
) {
  const command = `"${pythonPath}" "${scriptPath}" ${args.join(" ")}`;
  console.log(`Executing command:\n${command}`);

  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        maxBuffer: 1024 * 1024 * 20, // Increase buffer to 20MB
      },
      async (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error executing Python script ${scriptPath}:\n${stderr}`
          );
          reject(error);
          return;
        }
        // Write stdout to the outputPath
        try {
          await fs.writeFile(outputPath, stdout, "utf-8");
          console.log(`Output written to ${outputPath}`);
          resolve();
        } catch (writeError) {
          console.error(
            `Error writing output to ${outputPath}:\n${writeError}`
          );
          reject(writeError);
        }
      }
    );
  });
}
