// backend/controllers/api/photos-controller.js
//
// Returns JSON:API “photo” resources for a single album and ensures that
// every exported JPEG is named with a micro‑second‑precise UTC timestamp.
//
// Pipeline
// ─────────────────────────────────────────────────────────────────────
// 1. If photos.json or the JPEGs are missing → call osxphotos export.
//    (export produces   <uuid>.jpg  files)
// 2. For each photo
//      a) compute canonical name
//      b) if <uuid>.jpg exists and canonical name does not → rename
// 3. Serialize & return JSON to the Ember front‑end.

import fs from "fs-extra";
import path from "path";
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

/* ───── JSON:API serializers ───────────────────────────────────────── */

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

/* ───── controller ─────────────────────────────────────────────────── */

export const getPhotosByAlbumData = async (req, res) => {
  try {
    /* 0. paths & params */
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

    /* 1. ensure data exists */
    await fs.ensureDir(imagesDir);

    if (!(await fs.pathExists(photosJSON))) {
      await runPythonScript(python, pyExport, [albumUUID], photosJSON);
    }
    if (!(await fs.readdir(imagesDir)).length) {
      await runOsxphotosExportImages(
        osxphotos,
        albumUUID,
        imagesDir,
        photosJSON
      );
    }

    /* 2. load photo records */
    const photos = await fs.readJson(photosJSON);

    const personsMap = new Map(); // slug -> {id,name}

    for (const p of photos) {
      /* 2a. derive basics */
      p.originalName = path.parse(p.original_filename).name;
      const ts = formatPreciseTimestamp(p.date);
      p.exportedFilename = `${ts}-${p.originalName}.jpg`;
      p.persons = Array.isArray(p.persons) ? p.persons : [];

      /* 2b. rename physical file if needed */
      const src = path.join(imagesDir, `${p.uuid}.jpg`);
      const dst = path.join(imagesDir, p.exportedFilename);

      if (!(await fs.pathExists(dst))) {
        if (await fs.pathExists(src)) {
          await fs.rename(src, dst);
        } else {
          console.warn(`⚠︎ expected image missing: ${src}`);
        }
      }

      /* 2c. build person relationship data */
      p.personsData = p.persons.map((name) => {
        const slug = slug(name);
        if (!personsMap.has(slug)) personsMap.set(slug, { id: slug, name });
        return { type: "person", id: slug };
      });

      /* 2d. link album */
      p.album = albumUUID;
    }

    /* 3. sort */
    photos.sort((a, b) => {
      const va = getNestedProperty(a, sortAttr);
      const vb = getNestedProperty(b, sortAttr);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return sortOrder === "asc" ? va - vb : vb - va;
    });

    /* 4. serialize */
    const jsonPhotos = PhotoSerializer.serialize(photos);
    const jsonPersons = PersonSerializer.serialize([...personsMap.values()]);

    // glue person relationships onto photos
    jsonPhotos.data.forEach((d) => {
      const src = photos.find((p) => p.uuid === d.id);
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
    console.error("photos‑controller:", err);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

/* ───── helpers ────────────────────────────────────────────────────── */
function slug(str) {
  return str
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
