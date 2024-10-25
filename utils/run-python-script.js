// ./utils/run-python-script.js

import { execCommand } from "./exec-command.js";
import fs from "fs-extra";

// Helper function to run Python scripts and handle output
export async function runPythonScript(
  pythonPath,
  scriptPath,
  args = [],
  outputPath
) {
  const command = `"${pythonPath}" "${scriptPath}" ${args.join(" ")}`;
  const { stdout } = await execCommand(
    command,
    `Error executing Python script ${scriptPath}:`
  );

  // Write stdout to outputPath
  if (outputPath) {
    await fs.writeFile(outputPath, stdout, "utf-8");
    console.log(`Output written to ${outputPath}`);
  }
}
