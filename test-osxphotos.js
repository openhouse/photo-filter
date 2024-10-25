// test-osxphotos.js

import { exec } from "child_process";
import path from "path";
import fs from "fs-extra";

(async () => {
  const venvDir = path.join(process.cwd(), "venv");
  const osxphotosPath = path.join(venvDir, "bin", "osxphotos");
  const imagesDir = path.join(process.cwd(), "test-images");
  const uuidsFilePath = path.join(imagesDir, "uuids.txt");

  // Ensure imagesDir exists
  await fs.ensureDir(imagesDir);

  // Use a valid photo UUID from your library
  const testUUID = "REPLACE_WITH_VALID_UUID";
  await fs.writeFile(uuidsFilePath, testUUID, "utf-8");

  // Construct the command
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --verbose --debug`;

  console.log(`Executing command:\n${commandImages}`);

  exec(commandImages, { env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error exporting images:\nError: ${error.message}`);
      if (stderr) {
        console.error(`stderr:\n${stderr}`);
      }
      return;
    }
    if (stdout) {
      console.log(`stdout:\n${stdout}`);
    }
    console.log("Image export completed successfully.");
  });
})();
