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
import {
  formatPreciseTimestamp,
  getNestedProperty,
} from "../../utils/helpers.js";
import { Serializer } from "jsonapi-serializer";
import {
  getAlbumImagesDir,
  ensureRoots,
  getExportBase,
} from "../../config/storage-paths.js";
import { ensureAlbumPrepared } from "../../utils/prepare-album.js";

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

    await ensureRoots();
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(albumDir, "images");
    const exportBase = getExportBase(albumUUID);

    const venvDir = path.join(__dirname, "..", "..", "venv");
    const python = path.join(venvDir, "bin", "python3");
    const pyExport = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_photos_in_album.py",
    );
    const osxphotos = path.join(venvDir, "bin", "osxphotos");

    const albumStatus = await ensureAlbumPrepared({
      albumUUID,
      albumDir,
      photosJSON,
      imagesDir,
      legacyImagesDir,
      exportBase,
      python,
      pyExport,
      osxphotos,
    });

    /* (2) Load data & enrich */
    let photos = await fs.readJson(photosJSON);

    // Build an index of actual files we exported:
    // key = lowercased basename (no extension), value = full filename (with extension)
    const exportedNames = (await fs.pathExists(imagesDir))
      ? await fs.readdir(imagesDir)
      : [];
    const baseToActual = new Map();
    for (const name of exportedNames) {
      // strip only the last extension; keep any collision suffixes as part of basename
      const base = name.replace(/\.[^.]+$/, "");
      baseToActual.set(base.toLowerCase(), name);
    }

    const personsMap = new Map(); // slug -> {id,name}

    photos.forEach((p) => {
      /* derive names & filenames */
      p.originalName = path.parse(p.original_filename).name;
      const tsSegment = formatPreciseTimestamp(p.date);
      const base = `${tsSegment}-${p.originalName}`;
      // Prefer the real file if we already exported it (any extension)
      let actual = baseToActual.get(base.toLowerCase());
      // Cheap fallbacks for common collision suffixes if needed:
      if (!actual) {
        actual =
          baseToActual.get(`${base.toLowerCase()}-1`) ||
          baseToActual.get(`${base.toLowerCase()} (1)`);
      }
      // If still not found (e.g., export still running), keep the canonical guess
      p.exportedFilename = actual || `${base}.jpg`;

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
        exportStatus: albumStatus,
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
