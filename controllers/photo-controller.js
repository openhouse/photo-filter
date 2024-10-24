// ./controllers/photo-controller.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getPhotos = async (req, res) => {
  try {
    // Paths
    const dataDir = path.join(__dirname, "..", "data");
    const dataPath = path.join(dataDir, "photos.json");
    const imagesDir = path.join(dataDir, "images-source");
    const venvDir = path.join(__dirname, "..", "venv");
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    console.log("Data path:", dataPath);
    console.log("Images directory:", imagesDir);

    // Ensure data directory exists
    await fs.ensureDir(dataDir);

    // Check if osxphotos is installed in the virtual environment
    if (!(await fs.pathExists(osxphotosPath))) {
      console.error("osxphotos is not installed in the virtual environment.");
      res.status(500).send(`
        <h1>osxphotos is not installed.</h1>
        <p>Please run <code>yarn setup</code> to install osxphotos.</p>
      `);
      return;
    }

    // Check if photos.json exists
    if (!(await fs.pathExists(dataPath))) {
      console.log(
        "photos.json not found. Exporting metadata using osxphotos..."
      );

      // Export metadata using osxphotos
      await runOsxphotosExportData(osxphotosPath, dataPath);
    }

    // Read photos data
    const photosData = await fs.readJson(dataPath);

    // Filter and sort photos with score.overall
    const photosWithScores = photosData.filter(
      (photo) =>
        photo.score &&
        photo.score.overall !== null &&
        photo.score.overall !== undefined
    );

    const sortedPhotos = photosWithScores.sort(
      (a, b) => b.score.overall - a.score.overall
    );

    // Select the top N photos
    const topN = 500; // Adjust as needed
    const topPhotos = sortedPhotos.slice(0, topN);

    // Generate top_photo_uuids.txt
    const uuidsFilePath = path.join(dataDir, "top_photo_uuids.txt");
    const topPhotoUUIDs = topPhotos.map((photo) => photo.uuid);
    await fs.writeFile(uuidsFilePath, topPhotoUUIDs.join("\n"), "utf-8");
    console.log("UUIDs saved to top_photo_uuids.txt");

    // Check if images-source directory exists and has files
    const imagesExist =
      (await fs.pathExists(imagesDir)) &&
      (await fs.readdir(imagesDir)).length > 0;

    if (!imagesExist) {
      console.log("Images not found. Exporting images using osxphotos...");

      // Ensure images-source directory exists
      await fs.ensureDir(imagesDir);

      // Export images using osxphotos
      await runOsxphotosExportImages(osxphotosPath, uuidsFilePath, imagesDir);
    }

    // Pass the top photos to the view
    res.render("index", { photos: topPhotos });
  } catch (error) {
    console.error("Error processing photos:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Helper function to run osxphotos export-data
async function runOsxphotosExportData(osxphotosPath, outputPath) {
  const command = `"${osxphotosPath}" export-data --json "${outputPath}"`;
  await execCommand(command, "Error exporting metadata:");
}

// Helper function to run osxphotos export
async function runOsxphotosExportImages(osxphotosPath, uuidsFile, outputDir) {
  const command = `"${osxphotosPath}" export "${outputDir}" --uuid-from-file "${uuidsFile}" --filename "{original_name}" --skip-original-if-missing`;
  await execCommand(command, "Error exporting images:");
}

// Helper function to execute shell commands
async function execCommand(command, errorMessage) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error(errorMessage, stderr);
    } else {
      console.log(stdout);
    }
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
}
