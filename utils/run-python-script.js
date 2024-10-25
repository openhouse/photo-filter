// ./utils/run-python-script.js

import { execCommand } from "./exec-command.js";
import fs from "fs-extra";

// Helper function to run Python scripts
export async function runPythonScript(
  pythonPath,
  scriptPath,
  args = [],
  outputPath
) {
  const command = `"${pythonPath}" "${scriptPath}" ${args.join(" ")}`;
  await execCommand(command, `Error executing Python script ${scriptPath}:`);

  // If an output path is specified, read the output
  if (outputPath) {
    if (await fs.pathExists(outputPath)) {
      console.log(`Output written to ${outputPath}`);
    } else {
      throw new Error(`Expected output not found at ${outputPath}`);
    }
  }
}
