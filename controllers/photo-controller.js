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
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    // Ensure data directory exists
    await fs.ensureDir(dataDir);

    // Check if albums.json exists
    if (!(await fs.pathExists(albumsPath))) {
      console.log("albums.json not found. Exporting albums using osxphotos...");

      // Export albums using osxphotos
      await runOsxphotosExportAlbums(osxphotosPath, albumsPath);
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
    const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

    // Ensure directories exist
    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    // Check if photos.json exists
    if (!(await fs.pathExists(photosPath))) {
      console.log(
        `photos.json not found for album ${albumUUID}. Exporting photos using osxphotos...`
      );

      // Export photos for the album using osxphotos
      await runOsxphotosExportAlbumPhotos(
        osxphotosPath,
        albumUUID,
        photosPath,
        imagesDir
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

// Helper function to run osxphotos to export albums
async function runOsxphotosExportAlbums(osxphotosPath, outputPath) {
  const command = `"${osxphotosPath}" albums --json "${outputPath}"`;
  await execCommand(command, "Error exporting albums:");
}

// Helper function to export photos for a specific album
async function runOsxphotosExportAlbumPhotos(
  osxphotosPath,
  albumUUID,
  outputPath,
  imagesDir
) {
  // Export metadata
  const commandData = `"${osxphotosPath}" export-data --album-uuid "${albumUUID}" --json "${outputPath}"`;
  await execCommand(commandData, "Error exporting album photos metadata:");

  // Export images
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --album-uuid "${albumUUID}" --filename "{original_name}" --skip-original-if-missing`;
  await execCommand(commandImages, "Error exporting album images:");
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
