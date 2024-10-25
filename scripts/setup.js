// ./scripts/setup.js

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";

const execAsync = promisify(exec);

(async () => {
  try {
    const venvDir = path.join(process.cwd(), "venv");
    const venvPython = path.join(venvDir, "bin", "python3");
    const venvPip = path.join(venvDir, "bin", "pip");
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    // Use python3 explicitly
    const pythonExecutable = "python3";

    // Check if virtual environment exists
    const venvExists = await fs.pathExists(venvPython);

    if (!venvExists) {
      console.log(
        `Creating Python virtual environment with ${pythonExecutable}...`
      );
      await execAsync(`${pythonExecutable} -m venv venv`);
      console.log("Virtual environment created.");
    } else {
      console.log("Virtual environment already exists.");
    }

    // Install or upgrade osxphotos
    console.log(
      "Installing or upgrading osxphotos in the virtual environment..."
    );
    await execAsync(`"${venvPip}" install --upgrade osxphotos`);
    console.log("osxphotos installed or upgraded successfully.");

    console.log("Setup completed successfully.");
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
})();
