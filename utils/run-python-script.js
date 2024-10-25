// ./utils/run-python-script.js

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";

const execAsync = promisify(exec);

// Helper function to run Python scripts
export async function runPythonScript(
  pythonPath,
  scriptPath,
  args = [],
  outputPath
) {
  const command = `"${pythonPath}" "${scriptPath}" ${args.join(" ")}`;
  console.log(`Executing command:\n${command}`);
  try {
    // Execute the command and capture stdout and stderr
    const result = await execAsync(command, {
      env: process.env,
    });

    const { stdout, stderr } = result;

    if (stderr) {
      console.error(`Error executing Python script ${scriptPath}:\n${stderr}`);
    }

    // Write the stdout to the outputPath
    if (outputPath) {
      await fs.writeFile(outputPath, stdout, "utf-8");
      console.log(`Output written to ${outputPath}`);
    }
  } catch (error) {
    console.error(
      `Error executing Python script ${scriptPath}:\n${error.stderr || error}`
    );
    throw error;
  }
}
