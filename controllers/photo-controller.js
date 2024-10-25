// ./controllers/photo-controller.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get the list of albums
export const getAlbums = async (req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    const albumsPath = path.join(dataDir, "albums.json");
    const venvDir = path.join(__dirname, "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "scripts",
      "export_albums.py"
    );

    // Ensure data directory exists
    await fs.ensureDir(dataDir);

    // Check if albums.json exists
    if (!(await fs.pathExists(albumsPath))) {
      console.log("albums.json not found. Exporting albums using osxphotos...");

      // Export albums using the Python script
      await runPythonExportAlbums(pythonPath, scriptPath, albumsPath);
    }

    // Read albums data
    const albumsData = await fs.readJson(albumsPath);

    // Render albums view
    res.render("albums", { albums: albumsData });
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Function to get photos by album UUID
export const getPhotosByAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;

    // Paths
    const dataDir = path.join(__dirname, "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");
    const imagesDir = path.join(photosDir, "images");
    const venvDir = path.join(__dirname, "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "scripts",
      "export_photos_in_album.py"
    );
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    // Ensure directories exist
    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    // Check if photos.json exists
    if (!(await fs.pathExists(photosPath))) {
      console.log(
        `photos.json not found for album ${albumUUID}. Exporting photos using osxphotos...`
      );

      // Export photos for the album using the Python script
      await runPythonExportPhotos(
        pythonPath,
        scriptPath,
        albumUUID,
        photosPath
      );

      // Export images
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    // Read photos data
    const photosData = await fs.readJson(photosPath);

    // Pass the photos to the view
    res.render("index", { photos: photosData, albumUUID });
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Helper function to run the Python script to export albums
async function runPythonExportAlbums(pythonPath, scriptPath, outputPath) {
  const command = `"${pythonPath}" "${scriptPath}"`;
  const { stdout } = await execCommand(command, "Error exporting albums:");
  // Write the stdout to the outputPath
  await fs.writeFile(outputPath, stdout, "utf-8");
}

// Helper function to run the Python script to export photos
async function runPythonExportPhotos(
  pythonPath,
  scriptPath,
  albumUUID,
  outputPath
) {
  const command = `"${pythonPath}" "${scriptPath}" "${albumUUID}"`;
  const { stdout } = await execCommand(
    command,
    "Error exporting album photos metadata:"
  );
  // Write the stdout to the outputPath
  await fs.writeFile(outputPath, stdout, "utf-8");
}

// Helper function to export images using osxphotos
async function runOsxphotosExportImages(
  osxphotosPath,
  albumUUID,
  imagesDir,
  photosPath
) {
  // Read photo UUIDs from photos.json
  const photosData = await fs.readJson(photosPath);
  const uuids = photosData.map((photo) => photo.uuid).join("\n");
  const uuidsFilePath = path.join(imagesDir, "uuids.txt");

  // Ensure imagesDir exists
  await fs.ensureDir(imagesDir);

  // Write UUIDs to uuids.txt
  await fs.writeFile(uuidsFilePath, uuids, "utf-8");

  // Export images using osxphotos
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --skip-original-if-missing`;
  await execCommand(commandImages, "Error exporting album images:");
}

// Helper function to execute shell commands
async function execCommand(command, errorMessage) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error(errorMessage, stderr);
    }
    return { stdout, stderr };
  } catch (error) {
    console.error(errorMessage, error.stderr || error);
    throw error;
  }
}
