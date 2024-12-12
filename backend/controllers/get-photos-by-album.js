// ./controllers/get-photos-by-album.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { runPythonScript } from "../utils/run-python-script.js";
import {
  runOsxphotosExportImages,
  getNestedProperty,
} from "../utils/export-images.js";
import plist from "plist";
import { exec } from "child_process";
import os from "os";
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

export const getPhotosByAlbum = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

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

    await fs.ensureDir(photosDir);
    await fs.ensureDir(imagesDir);

    if (!(await fs.pathExists(photosPath))) {
      // Export photos metadata
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
      // Export images with osxphotos (directly uses date/time prefix)
      await runOsxphotosExportImages(
        osxphotosPath,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    const photosData = await fs.readJson(photosPath);

    // Add 'original_name' property
    // Since images are now named with a prefix, original_filename should reflect that.
    photosData.forEach((photo) => {
      photo.original_name = path.parse(photo.original_filename).name;
    });

    const limit = 60;

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

    const photoTags = {};

    attributesToProcess.forEach(({ name, order, limit }) => {
      const sortedPhotos = [...photosData].sort((a, b) => {
        const aValue = getNestedProperty(a, name);
        const bValue = getNestedProperty(b, name);
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        return order === "asc" ? aValue - bValue : bValue - aValue;
      });

      const topPhotos = sortedPhotos.slice(0, limit);
      topPhotos.forEach((photo) => {
        if (!photoTags[photo.uuid]) {
          photoTags[photo.uuid] = [];
        }
        const attributeDisplayName = capitalizeAttributeName(name);
        if (!photoTags[photo.uuid].includes(attributeDisplayName)) {
          photoTags[photo.uuid].push(attributeDisplayName);
        }
      });
    });

    photosData.forEach((photo) => {
      photo.tags = photoTags[photo.uuid] || [];
    });

    const scoreAttributes = Object.keys(photosData[0].score);

    // Sort the photos by requested attribute
    photosData.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

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

function capitalizeAttributeName(attributeName) {
  const nameParts = attributeName.split(".");
  const lastPart = nameParts[nameParts.length - 1];
  return lastPart
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function setTagsOnExportedImages(imagesDir, photosData) {
  for (const photo of photosData) {
    const tags = photo.tags || [];
    if (tags.length === 0) continue;

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
