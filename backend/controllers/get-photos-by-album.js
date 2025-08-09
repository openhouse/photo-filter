// ./controllers/get-photos-by-album.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { runPythonScript } from "../utils/run-python-script.js";
import {
  getNestedProperty,
  capitalizeAttributeName,
} from "../utils/helpers.js";

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
    const venvDir = path.join(__dirname, "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "scripts",
      "export_photos_in_album.py"
    );

    await fs.ensureDir(photosDir);

    if (!(await fs.pathExists(photosPath))) {
      // Export photos metadata
      await runPythonScript(pythonPath, scriptPath, [albumUUID], photosPath);
    }

    const photosData = await fs.readJson(photosPath);

    // Add 'original_name' property
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

  } catch (error) {
    console.error("Error fetching photos for album:", error);
    res.status(500).send("Internal Server Error");
  }
};
