// ./controllers/get-photos-by-album.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { runPythonScript } from "../utils/run-python-script.js";
import { execCommand } from "../utils/exec-command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get photos by album UUID
export const getPhotosByAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;

    // Paths that bridge the digital and physical file systems
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

    // Ensure directories exist in the physical space
    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    // Check if photos.json exists
    if (!(await fs.pathExists(photosPath))) {
      console.log(
        `photos.json not found for album ${albumUUID}. Exporting photos using osxphotos...`
      );

      // Export photos metadata using the Python script
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);

      // Export images to bridge the digital metadata with physical images
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    // Read photos data, integrating social metadata if available
    const photosData = await fs.readJson(photosPath);

    // Pass the photos to the view, where digital meets social interaction
    res.render("index", { photos: photosData, albumUUID });
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).send("Internal Server Error");
  }
};

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

  // Use {original_name} template to match filenames in photos.json
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --verbose --debug`;

  console.log(`Executing command:\n${commandImages}`);
  await execCommand(commandImages, "Error exporting album images:");
}
