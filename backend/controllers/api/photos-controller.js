// backend/controllers/api/photos-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { execCommand } from "../../utils/exec-command.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure 'type' is 'photo' and prevent pluralization
const PhotoSerializer = new Serializer("photo", {
  id: "uuid", // Use 'uuid' as the 'id' field
  attributes: [
    "originalName",
    "originalFilename",
    "filename",
    "score",
    "exifInfo",
  ],
  keyForAttribute: "camelCase",
  relationships: {
    album: {
      type: "album", // Use singular 'album' for the relationship
    },
  },
  pluralizeType: false, // Prevent automatic pluralization
});

export const getPhotosByAlbumData = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall"; // Default sort attribute
    const sortOrder = req.query.order || "desc"; // Default sort order

    // Paths
    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");
    const imagesDir = path.join(photosDir, "images");
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
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
      // Export photos metadata
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
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

    // Add 'originalName' property to each photo
    photosData.forEach((photo) => {
      photo.originalName = path.parse(photo.original_filename).name;
    });

    // Extract the list of score attributes
    const scoreAttributes = Object.keys(photosData[0].score);

    // Sort photos based on the requested attribute
    photosData.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Add album relationship
    photosData.forEach((photo) => {
      photo.album = albumUUID;
    });

    // Serialize data
    const jsonApiData = PhotoSerializer.serialize(photosData);

    // Send JSON response with photos and available score attributes
    res.json({
      ...jsonApiData,
      meta: {
        albumUUID,
        sortAttribute,
        sortOrder,
        scoreAttributes,
      },
    });
  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
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

  // Use {original_name} template to avoid double extensions
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --convert-to-jpeg --jpeg-ext jpg`;

  console.log(`Executing command:\n${commandImages}`);
  await execCommand(commandImages, "Error exporting album images:");
}

// Helper function to get nested properties safely
function getNestedProperty(obj, propertyPath) {
  return propertyPath
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj
    );
}
