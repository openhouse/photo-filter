// ./controllers/get-photos-by-album.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import plist from "plist";
import { exec } from "child_process";
import os from "os";
import { createRequire } from "module";
import {
  getNestedProperty,
  capitalizeAttributeName,
} from "../utils/helpers.js";
import {
  ensureRoots,
  getAlbumImagesDir,
  getExportBase,
  getLibraryRoot,
} from "../config/storage-paths.js";
import { ensureAlbumPrepared } from "../utils/prepare-album.js";
import { loadStatus } from "../utils/export-status.js";

const require = createRequire(import.meta.url);
let tag;
try {
  tag = require("osx-tag");
} catch (error) {
  console.warn(
    "[get-photos-by-album] osx-tag not available; Finder tags disabled",
    error,
  );
  tag = {
    setTags: (_filePath, _tags, callback) => {
      if (typeof callback === "function") {
        callback(null);
      }
    },
  };
}

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

const PREP_ON_RENDER = process.env.PF_PREP_ON_RENDER === "1";

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
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(photosDir, "images");
    const skippedMarkerPath = path.join(imagesDir, ".skipped-empty");
    const exportBase = getExportBase(albumUUID);
    const libraryRoot = getLibraryRoot();

    await ensureRoots();

    const hasPhotos = await fs.pathExists(photosPath);
    const wantsPrepare = PREP_ON_RENDER || req.query.prepare === "1";

    if (!hasPhotos && !wantsPrepare) {
      res
        .status(202)
        .set("X-PF-Export-Status", "needs-prep")
        .render("index", {
          photos: [],
          albumUUID,
          sortAttribute,
          sortOrder,
          scoreAttributes: [],
        });
      return;
    }

    if (!hasPhotos && wantsPrepare) {
      const venvDir = path.join(__dirname, "..", "venv");
      const pythonPath = path.join(venvDir, "bin", "python3");
      const scriptPath = path.join(
        __dirname,
        "..",
        "scripts",
        "export_photos_in_album.py"
      );
      const osxphotosPath = path.join(venvDir, "bin", "osxphotos");

      await ensureAlbumPrepared({
        albumUUID,
        albumDir: photosDir,
        photosJSON: photosPath,
        imagesDir,
        legacyImagesDir,
        exportBase,
        libraryRoot,
        python: pythonPath,
        pyExport: scriptPath,
        osxphotos: osxphotosPath,
      });
    }

    const albumStatus = await loadStatus(albumUUID, {
      exportBase,
      photosJSON: photosPath,
    });

    let exportStatus = null;
    if (await fs.pathExists(skippedMarkerPath)) {
      exportStatus = "skipped-empty";
    }

    const photosData = await fs.readJson(photosPath);
    const albumCount = Array.isArray(photosData) ? photosData.length : 0;

    if (
      !exportStatus &&
      albumCount === 0 &&
      (await fs.pathExists(skippedMarkerPath))
    ) {
      exportStatus = "skipped-empty";
    }

    res.set("X-PF-Album-Count", String(albumCount));
    const statusHeader =
      exportStatus || albumStatus?.status || albumStatus?.status === "ready"
        ? exportStatus || albumStatus?.status
        : null;
    if (statusHeader) {
      res.set("X-PF-Export-Status", statusHeader);
    }

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

    const scoreAttributes =
      photosData.length > 0 && photosData[0].score
        ? Object.keys(photosData[0].score)
        : [];

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
