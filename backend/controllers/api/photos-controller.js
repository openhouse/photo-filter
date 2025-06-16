// backend/controllers/api/photos-controller.js
//
// Now uses the shared `formatPreciseTimestamp` helper and never
// performs a post-export rename.  The export routine already wrote
// filenames with 6-digit micro-second precision, guaranteeing
// uniqueness and correct lexicographic sort.
//

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../../utils/export-images.js";
import { getNestedProperty } from "../../utils/helpers.js";
import { formatPreciseTimestamp } from "../../utils/precise-timestamp.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- Serializers ---------------- */

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

/* ---------------- Controller ---------------- */

export const getPhotosByAlbumData = async (req, res) => {
  try {
    /* ── params, paths ───────────────────────── */
    const albumUUID = req.params.albumUUID;
    const sortAttr = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const photosDir = path.join(dataDir, "albums", albumUUID);
    const photosPath = path.join(photosDir, "photos.json");
    const imagesDir = path.join(photosDir, "images");

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

    /* ── ensure exports exist ────────────────── */
    await fs.ensureDir(imagesDir);

    if (!(await fs.pathExists(photosPath))) {
      // ❶ export metadata
      await runPythonScript(python, pyExport, [albumUUID], photosPath);
      // ❷ export jpegs with new filename template
      await runOsxphotosExportImages(
        osxphotos,
        albumUUID,
        imagesDir,
        photosPath
      );
    }

    /* ── load & enrich data ──────────────────── */
    let photos = await fs.readJson(photosPath);

    const personsSet = new Map(); // slug → {id,name}

    photos.forEach((p) => {
      p.originalName = path.parse(p.original_filename).name;

      // Build the filename we know osxphotos wrote
      const tsSegment = formatPreciseTimestamp(p.date); // returns YYYYMMDD-…ffffff
      p.exportedFilename = `${tsSegment}-${p.originalName}.jpg`;

      // persons → array assur’d
      p.persons = Array.isArray(p.persons) ? p.persons : [];

      // Collect persons across set
      p.personsData = p.persons.map((name) => {
        const slug = slugify(name);
        if (!personsSet.has(slug)) personsSet.set(slug, { id: slug, name });
        return { type: "person", id: slug };
      });

      p.album = albumUUID;
    });

    /* ── sorting ─────────────────────────────── */
    photos.sort((a, b) => {
      const va = getNestedProperty(a, sortAttr);
      const vb = getNestedProperty(b, sortAttr);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return sortOrder === "asc" ? va - vb : vb - va;
    });

    /* ── JSON:API serialise ──────────────────── */
    const jsonPhotos = PhotoSerializer.serialize(photos);
    const jsonPersons = PersonSerializer.serialize([...personsSet.values()]);

    // attach person relationships
    jsonPhotos.data.forEach((photoDatum) => {
      const origin = photos.find((p) => p.uuid === photoDatum.id);
      photoDatum.relationships = photoDatum.relationships || {};
      photoDatum.relationships.persons = {
        data: origin.personsData,
      };
    });

    res.json({
      data: jsonPhotos.data,
      included: jsonPersons.data,
      meta: {
        albumUUID,
        sortAttribute: sortAttr,
        sortOrder,
        scoreAttributes:
          photos.length > 0 && photos[0].score
            ? Object.keys(photos[0].score)
            : [],
      },
    });
  } catch (err) {
    console.error("photos-controller:", err);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

/* ────────────────────────────────────────────── */

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
