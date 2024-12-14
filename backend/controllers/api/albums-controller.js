// backend/controllers/api/albums-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

const AlbumSerializer = new Serializer("album", {
  id: "uuid",
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

    await fs.ensureDir(dataDir);

    if (!(await fs.pathExists(albumsPath))) {
      console.log("albums.json not found. Exporting albums using osxphotos...");
      await runPythonScript(pythonPath, scriptPath, [], albumsPath);
    }

    const albumsData = await fs.readJson(albumsPath);
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

    let persons = [];
    if (await fs.pathExists(photosPath)) {
      const photosData = await fs.readJson(photosPath);
      const allPersons = new Set();
      photosData.forEach((photo) => {
        if (Array.isArray(photo.persons)) {
          photo.persons.forEach((name) => allPersons.add(name));
        }
      });
      persons = Array.from(allPersons).map((name) => {
        return {
          id: slugifyName(name),
          name: name,
        };
      });
    }

    const albumRecord = {
      uuid: album.uuid,
      title: album.title,
    };

    let albumJsonApi = AlbumSerializer.serialize(albumRecord);
    albumJsonApi.data.relationships = albumJsonApi.data.relationships || {};
    albumJsonApi.data.relationships.persons = {
      data: persons.map((p) => ({ type: "person", id: p.id })),
    };

    const personJsonApi = PersonSerializer.serialize(persons);

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

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
