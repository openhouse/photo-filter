// backend/controllers/api/photos-controller.js
//
// Builds `exportedFilename` from the *same* micro-second timestamp that
// osxphotos embedded, so the frontend can construct <img src> without
// touching the filesystem.
//
// NB: any older duplicate controller (e.g. “-photos-controller.js”)
//     should be deleted to prevent route-loader ambiguity.

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../../utils/export-images.js";
import {
  formatPreciseTimestamp,
  getNestedProperty,
} from "../../utils/helpers.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- JSON:API serializers ---------- */

const PersonSerializer = new Serializer("person", {
  id: "id",
  attributes: ["name"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

const PhotoSerializer = new Serializer("photo", {
  id: "uuid",
  attributes: [
    "originalName",
    "originalFilename",
    "exportedFilename",
    "score",
    "exifInfo",
  ],
  relationships: {
    album: { type: "album" },
    persons: { type: "person" },
  },
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

/* ---------- main controller ---------- */

export const getPhotosByAlbumData = async (req, res) => {
  try {
    /* paths & params */
    const albumUUID = req.params.albumUUID;
    const sortAttr = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const imagesDir = path.join(albumDir, "images");

    const venvDir = path.join(__dirname, "..", "..", "venv");
    const python = path.join(venvDir, "bin", "python3");
    const pyExport = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_photos_in_album.py"
    );
    const osxphotos = path.join(venvDir, "bin", "osxphotos");

    /* (1) Ensure exports exist */
    await fs.ensureDir(imagesDir);
    if (!(await fs.pathExists(photosJSON))) {
      await runPythonScript(python, pyExport, [albumUUID], photosJSON);
      await runOsxphotosExportImages(
        osxphotos,
        albumUUID,
        imagesDir,
        photosJSON
      );
    }

    /* (2) Load data & enrich */
    let photos = await fs.readJson(photosJSON);

    const personsMap = new Map(); // slug -> {id,name}

    photos.forEach((p) => {
      /* derive names & filenames */
      p.originalName = path.parse(p.original_filename).name;
      const tsSegment = formatPreciseTimestamp(p.date, p.tzoffset);
      p.exportedFilename = `${tsSegment}-${p.originalName}.jpg`;

      /* normalise persons */
      p.persons = Array.isArray(p.persons) ? p.persons : [];

      p.personsData = p.persons.map((name) => {
        const slug = slugify(name);
        if (!personsMap.has(slug)) personsMap.set(slug, { id: slug, name });
        return { type: "person", id: slug };
      });

      p.album = albumUUID;
    });

    /* (3) sort */
    photos.sort((a, b) => {
      const va = getNestedProperty(a, sortAttr);
      const vb = getNestedProperty(b, sortAttr);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return sortOrder === "asc" ? va - vb : vb - va;
    });

    /* (4) serialise */
    const jsonPhotos = PhotoSerializer.serialize(photos);
    const jsonPersons = PersonSerializer.serialize([...personsMap.values()]);

    // attach person relationships
    jsonPhotos.data.forEach((d) => {
      const src = photos.find((p) => p.uuid === d.id);
      d.relationships = d.relationships || {};
      d.relationships.persons = { data: src.personsData };
    });

    res.json({
      data: jsonPhotos.data,
      included: jsonPersons.data,
      meta: {
        albumUUID,
        sortAttribute: sortAttr,
        sortOrder,
        scoreAttributes:
          photos.length && photos[0].score ? Object.keys(photos[0].score) : [],
      },
    });
  } catch (err) {
    console.error("photos-controller:", err);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

/* ---------- util ---------- */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
