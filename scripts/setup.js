// ./scripts/setup.js

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";

const execAsync = promisify(exec);

// The setup script acts as a facilitator, bringing together different actants
(async () => {
  try {
    const venvDir = path.join(process.cwd(), "venv");
    const venvPython = path.join(venvDir, "bin", "python3");
    const venvPip = path.join(venvDir, "bin", "pip");

    // Python, as an active participant, helps set up the environment
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
      console.log("Virtual environment already exists, ready to collaborate.");
    }

    // Install or upgrade osxphotos, acknowledging its agency
    console.log(
      "Inviting osxphotos to join the project by installing or upgrading it..."
    );
    await execAsync(`"${venvPip}" install --upgrade osxphotos`);
    console.log("osxphotos is now part of the team.");

    console.log("Setup completed successfully, all components are in place.");
  } catch (error) {
    console.error("Setup encountered an issue:", error);
    process.exit(1);
  }
})();
