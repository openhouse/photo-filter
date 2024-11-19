// ./controllers/get-photos-by-album.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { runPythonScript } from "../utils/run-python-script.js";
import { execCommand } from "../utils/exec-command.js";
import plist from "plist";
import { exec } from "child_process";

import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const tag = require("osx-tag");

async function setFinderTags(filePath, tags) {
  return new Promise((resolve, reject) => {
    tag.setTags(filePath, tags, (err) => {
      if (err) {
        console.error(`Error setting Finder tags for ${filePath}:`, err);
        reject(err);
      } else {
        console.log(`Tags set successfully for ${filePath}.`);
        resolve();
      }
    });
  });
}

// Function to get photos by album UUID with sorting and tagging
export const getPhotosByAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall"; // Default sort attribute
    const sortOrder = req.query.order || "desc"; // Default sort order

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

    // Add 'original_name' property to each photo
    photosData.forEach((photo) => {
      photo.original_name = path.parse(photo.original_filename).name;
    });

    const limit = 50;

    // List of attributes to process
    const attributesToProcess = [
      { name: "score.overall", order: "desc", limit: limit },
      { name: "score.curation", order: "desc", limit: limit },
      { name: "score.highlight_visibility", order: "desc", limit: limit },
      { name: "score.harmonious_color", order: "desc", limit: limit },
      { name: "score.immersiveness", order: "desc", limit: limit },
      { name: "score.interaction", order: "desc", limit: limit },
      { name: "score.interesting_subject", order: "desc", limit: limit },
      { name: "score.intrusive_object_presence", order: "asc", limit: limit },
      { name: "score.lively_color", order: "desc", limit: limit },
      { name: "score.noise", order: "desc", limit: Math.ceil(limit / 4) },
      { name: "score.pleasant_camera_tilt", order: "desc", limit: limit },
      { name: "score.pleasant_composition", order: "desc", limit: limit },
      { name: "score.pleasant_lighting", order: "desc", limit: limit },
      { name: "score.pleasant_pattern", order: "desc", limit: limit },
      { name: "score.pleasant_perspective", order: "desc", limit: limit },
      { name: "score.pleasant_post_processing", order: "desc", limit: limit },
      { name: "score.pleasant_reflection", order: "desc", limit: limit },
      { name: "score.pleasant_symmetry", order: "desc", limit: limit },
      { name: "score.sharply_focused_subject", order: "desc", limit: limit },
      { name: "score.tastefully_blurred", order: "desc", limit: limit },
      { name: "score.well_chosen_subject", order: "desc", limit: limit },
      { name: "score.well_framed_subject", order: "desc", limit: limit },
      { name: "score.well_timed_shot", order: "desc", limit: limit },
    ];

    // Initialize a map to keep track of tags for each photo
    const photoTags = {};

    // For each attribute, compute the top N photos
    attributesToProcess.forEach(({ name, order, limit }) => {
      // Sort photos based on the attribute
      const sortedPhotos = [...photosData].sort((a, b) => {
        const aValue = getNestedProperty(a, name);
        const bValue = getNestedProperty(b, name);

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (order === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // Take the top N photos
      const topPhotos = sortedPhotos.slice(0, limit);

      // Add the attribute name to the tags for each top photo
      topPhotos.forEach((photo) => {
        const photoId = photo.uuid;
        if (!photoTags[photoId]) {
          photoTags[photoId] = [];
        }
        // Extract the attribute display name
        const attributeDisplayName = capitalizeAttributeName(name);
        if (!photoTags[photoId].includes(attributeDisplayName)) {
          photoTags[photoId].push(attributeDisplayName);
        }
      });
    });

    // Now, when rendering the photos, include the tags
    photosData.forEach((photo) => {
      photo.tags = photoTags[photo.uuid] || [];
    });

    // Extract the list of score attributes for the dropdown
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

    // Pass the photos and score attributes to the view
    res.render("index", {
      photos: photosData,
      albumUUID,
      sortAttribute,
      sortOrder,
      scoreAttributes,
    });

    // After rendering, set Finder tags on the exported images
    await setTagsOnExportedImages(imagesDir, photosData);
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

  // Use {original_name} template to avoid double extensions
  const commandImages = `"${osxphotosPath}" export "${imagesDir}" --uuid-from-file "${uuidsFilePath}" --filename "{original_name}" --convert-to-jpeg --jpeg-ext jpg`;

  console.log(`Executing command:\n${commandImages}`);
  await execCommand(commandImages, "Error exporting album images:");
}

// Helper function to get nested properties safely
function getNestedProperty(obj, propertyPath) {
  return propertyPath.split(".").reduce((acc, part) => {
    if (acc && acc[part] !== undefined) {
      return acc[part];
    } else {
      return null;
    }
  }, obj);
}

// Helper function to capitalize attribute names
function capitalizeAttributeName(attributeName) {
  // Convert 'score.overall' to 'Overall'
  const nameParts = attributeName.split(".");
  const lastPart = nameParts[nameParts.length - 1];
  return lastPart
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Function to set tags on exported images
async function setTagsOnExportedImages(imagesDir, photosData) {
  for (const photo of photosData) {
    const tags = photo.tags || [];

    if (tags.length === 0) {
      continue; // No tags to set
    }

    // **Add the count tag**
    const countTag = `${tags.length} Tags`;
    tags.push(countTag);

    const imageFileName = `${photo.original_name}.jpg`;
    const imagePath = path.join(imagesDir, imageFileName);

    if (await fs.pathExists(imagePath)) {
      try {
        await setFinderTags(imagePath, tags);
        console.log(`Set tags for ${imageFileName}: ${tags.join(", ")}`);
      } catch (error) {
        console.error(`Error setting tags for ${imageFileName}:`, error);
      }
    } else {
      console.warn(`Image not found: ${imageFileName}`);
    }
  }
}
