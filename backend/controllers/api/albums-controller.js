// backend/controllers/api/albums-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll create a Person serializer and an Album serializer.
// Person serializer
const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

// Album serializer: now includes a relationship to persons
const AlbumSerializer = new Serializer("album", {
  id: "uuid", // Use 'uuid' as the 'id' field
  attributes: ["title"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
  relationships: {
    persons: {
      type: "person",
    },
  },
});

export const getAlbumsData = async (req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsPath = path.join(dataDir, "albums.json");
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_albums.py"
    );

    // Ensure data directory exists
    await fs.ensureDir(dataDir);

    // Check if albums.json exists
    if (!(await fs.pathExists(albumsPath))) {
      console.log("albums.json not found. Exporting albums using osxphotos...");
      await runPythonScript(pythonPath, scriptPath, [], albumsPath);
    }

    // Read albums data
    const albumsData = await fs.readJson(albumsPath);

    // Serialize data (no persons here yet)
    const jsonApiData = AlbumSerializer.serialize(albumsData);
    res.json(jsonApiData);
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

export const getAlbumById = async (req, res) => {
  try {
    const albumUUID = req.params.albumUUID;
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsPath = path.join(dataDir, "albums.json");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");

    const albumsData = await fs.readJson(albumsPath);
    const album = albumsData.find((a) => a.uuid === albumUUID);

    if (!album) {
      return res.status(404).json({ errors: [{ detail: "Album not found" }] });
    }

    // If we have photos for this album, we can find persons
    let persons = [];
    if (await fs.pathExists(photosPath)) {
      const photosData = await fs.readJson(photosPath);

      // Extract persons from all photos
      const allPersons = new Set();
      photosData.forEach((photo) => {
        if (Array.isArray(photo.persons)) {
          photo.persons.forEach((name) => allPersons.add(name));
        }
      });

      // Create person objects
      persons = Array.from(allPersons).map((name) => {
        return {
          id: slugifyName(name),
          name: name,
        };
      });
    }

    // Now we need to include these persons in the album JSON:API response.
    // Add a relationships.persons to the album record:
    const albumRecord = {
      uuid: album.uuid,
      title: album.title,
    };

    // Serialize the album alone first
    let albumJsonApi = AlbumSerializer.serialize(albumRecord);

    // Now add persons to the album’s relationships:
    albumJsonApi.data.relationships = albumJsonApi.data.relationships || {};
    albumJsonApi.data.relationships.persons = {
      data: persons.map((p) => ({ type: "person", id: p.id })),
    };

    // Serialize persons separately
    const personJsonApi = PersonSerializer.serialize(persons);

    // Merge included persons
    const merged = {
      data: albumJsonApi.data,
      included: personJsonApi.data,
      meta: {},
    };

    res.json(merged);
  } catch (error) {
    console.error("Error fetching album:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

// Helper function to slugify person names
function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
