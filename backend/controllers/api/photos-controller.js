// backend/controllers/api/photos-controller.js
//
// Export photos & videos for a single album, rename them with
// micro‑second‑precise UTC timestamps, and return JSON:API photo resources.

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import fg from "fast-glob";
import pMap from "p-map";
import { runPythonScript } from "../../utils/run-python-script.js";
import { runOsxphotosExportImages } from "../../utils/export-images.js";
import {
  formatPreciseTimestamp,
  getNestedProperty,
} from "../../utils/helpers.js";
import { mediaTypeFromExt } from "../../utils/media-type.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─────────── JSON:API serializers ─────────────────────────────────── */

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
    "mediaType",
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

/* ─────────── controller ───────────────────────────────────────────── */

export const getPhotosByAlbumData = async (req, res) => {
  try {
    /* 0. paths & params */
    const albumUUID = req.params.albumUUID;
    const sortAttr = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosDB = path.join(albumDir, "photos.json");
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

    /* 1. ensure data exists */
    await fs.ensureDir(imagesDir);

    if (!(await fs.pathExists(photosDB))) {
      await runPythonScript(python, pyExport, [albumUUID], photosDB);
    }
    if ((await fs.readdir(imagesDir)).length === 0) {
      await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, photosDB);
    }

    /* 2. load photo records */
    const photos = await fs.readJson(photosDB);

    /* 3. parallel rename pass (8 concurrent) */
    await pMap(
      photos,
      async (p) => {
        p.originalName = path.parse(p.original_filename).name;

        // find real file with any extension
        const pattern = path.join(imagesDir, `${p.uuid}.*`);
        const matches = await fg(pattern, {
          dot: false,
          caseSensitiveMatch: false,
        });
        if (matches.length === 0) {
          console.warn(`⚠︎ expected image missing: ${p.uuid}.*`);
          return;
        }

        const src = matches[0];
        const ext = path.extname(src).toLowerCase(); // includes leading '.'
        const ts = formatPreciseTimestamp(p.date);
        p.exportedFilename = `${ts}-${p.originalName}${ext}`;
        p.mediaType = mediaTypeFromExt(ext);

        const dst = path.join(imagesDir, p.exportedFilename);
        if (!(await fs.pathExists(dst))) {
          await fs.rename(src, dst);
        }

        // build person relationship array
        p.persons = Array.isArray(p.persons) ? p.persons : [];
        p.personsData = p.persons.map((n) => {
          const slug = slugify(n);
          return { type: "person", id: slug };
        });

        // link album
        p.album = albumUUID;
      },
      { concurrency: 8 }
    );

    /* 4. aggregate persons */
    const personsMap = new Map();
    photos.forEach((p) =>
      p.persons.forEach((n) =>
        personsMap.set(slugify(n), { id: slugify(n), name: n })
      )
    );

    /* 5. sort */
    photos.sort((a, b) => {
      const va = getNestedProperty(a, sortAttr);
      const vb = getNestedProperty(b, sortAttr);
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return sortOrder === "asc" ? va - vb : vb - va;
    });

    /* 6. serialize */
    const jsonPhotos = PhotoSerializer.serialize(photos);
    const jsonPersons = PersonSerializer.serialize([...personsMap.values()]);

    // glue relationships
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
    console.error("photos-controller:", err);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

/* ─────────── helpers ─────────────────────────────────────────────── */

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[\s+]/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
