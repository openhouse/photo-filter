// backend/controllers/people-legacy-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { getNestedProperty } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Show all people in an album
export const getPeopleInAlbumLegacy = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const dataDir = path.join(__dirname, "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res.status(404).send("Album not found or no photos available");
    }

    const photosData = await fs.readJson(photosPath);

    // Gather all distinct people
    const allPersons = new Set();
    for (const photo of photosData) {
      if (Array.isArray(photo.persons)) {
        photo.persons.forEach((p) => allPersons.add(p));
      }
    }

    const people = Array.from(allPersons).sort();

    // Render persons.hbs view
    res.render("persons", { albumUUID, people });
  } catch (error) {
    console.error("Error fetching people in album:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Show photos of a single person in the album
export const getPhotosByPersonLegacy = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const personName = req.params.personName;
    const sortAttribute = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    if (!(await fs.pathExists(photosPath))) {
      return res.status(404).send("Album not found or no photos available");
    }

    const photosData = await fs.readJson(photosPath);

    // Filter photos by person
    const filteredPhotos = photosData.filter((photo) => {
      return Array.isArray(photo.persons) && photo.persons.includes(personName);
    });

    if (filteredPhotos.length === 0) {
      // No photos of this person
      return res.render("person", {
        albumUUID,
        personName,
        photos: [],
        scoreAttributes: [],
        sortAttribute,
        sortOrder,
      });
    }

    // Add original_name property
    filteredPhotos.forEach((photo) => {
      photo.original_name = path.parse(photo.original_filename).name;
    });

    // Extract score attributes from the first photo
    const scoreAttributes = Object.keys(filteredPhotos[0].score);

    // Sort photos based on the requested attribute
    filteredPhotos.sort((a, b) => {
      const aValue = getNestedProperty(a, sortAttribute);
      const bValue = getNestedProperty(b, sortAttribute);

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Render person.hbs view
    res.render("person", {
      albumUUID,
      personName,
      photos: filteredPhotos,
      scoreAttributes,
      sortAttribute,
      sortOrder,
    });
  } catch (error) {
    console.error("Error fetching photos for person:", error);
    res.status(500).send("Internal Server Error");
  }
};
