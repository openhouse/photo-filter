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
import { slugifyName } from "../../utils/slugify-name.js";
import { Serializer } from "jsonapi-serializer";
import {
  getAlbumImagesDir,
  ensureRoots,
  getExportBase,
  getLibraryRoot,
} from "../../config/storage-paths.js";
import { ensureAlbumPrepared } from "../../utils/prepare-album.js";
import { loadStatus, writeStatus } from "../../utils/export-status.js";
import { buildExportedFilename } from "../../utils/exported-filename.js";

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

const PREP_ON_RENDER = process.env.PF_PREP_ON_RENDER === "1";

/* ---------- main controller ---------- */

export const getPhotosByAlbumData = async (req, res) => {
  const albumUUID = req.params.albumUUID;
  try {
    /* paths & params */
    const sortAttr = req.query.sort || "score.overall";
    const sortOrder = req.query.order || "desc";

    await ensureRoots();
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(albumDir, "images");
    const exportBase = getExportBase(albumUUID);
    const libraryRoot = getLibraryRoot();

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

    let albumStatus = await loadStatus(albumUUID, { exportBase, photosJSON });

    const hasPhotos = await fs.pathExists(photosJSON);
    const wantsPrepare = PREP_ON_RENDER || req.query.prepare === "1";

    if (!hasPhotos && !wantsPrepare) {
      const status = albumStatus?.status || "needs-prep";
      const retryAfterSeconds = Number.isFinite(albumStatus?.retryAfterSeconds)
        ? Math.max(1, Math.round(albumStatus.retryAfterSeconds))
        : 2;
      res
        .status(202)
        .set("X-PF-Export-Status", status)
        .set("X-PF-Album-Count", "0")
        .set("Link", `</api/albums/${albumUUID}/status>; rel="status"`)
        .set("Retry-After", String(retryAfterSeconds))
        .set("Cache-Control", "no-store")
        .json({
          data: [],
          included: [],
          meta: {
            albumUUID,
            sortAttribute: sortAttr,
            sortOrder,
            scoreAttributes: [],
            exportStatus: albumStatus || { status },
            nextSteps: {
              prepareQuery: `/api/albums/${albumUUID}/photos?prepare=1`,
              prepareEndpoint: `/api/albums/${albumUUID}/prepare`,
              statusEndpoint: `/api/albums/${albumUUID}/status`,
            },
            message:
              "Album is not prepared. Use ?prepare=1 or POST /api/albums/:albumUUID/prepare to start export.",
          },
        });
      return;
    }

    if (!hasPhotos && wantsPrepare) {
      albumStatus = await ensureAlbumPrepared({
        albumUUID,
        albumDir,
        photosJSON,
        imagesDir,
        legacyImagesDir,
        exportBase,
        libraryRoot,
        python,
        pyExport,
        osxphotos,
      });
    }

    if (hasPhotos && wantsPrepare && albumStatus?.status !== "ready") {
      albumStatus = await ensureAlbumPrepared({
        albumUUID,
        albumDir,
        photosJSON,
        imagesDir,
        legacyImagesDir,
        exportBase,
        libraryRoot,
        python,
        pyExport,
        osxphotos,
      });
    }

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
      const exportedGuess = buildExportedFilename(p);
      const base = exportedGuess
        ? exportedGuess.replace(/\.[^.]+$/, "")
        : `${formatPreciseTimestamp(p.date)}-${p.originalName}`;
      // Prefer the real file if we already exported it (any extension)
      let actual = baseToActual.get(base.toLowerCase());
      // Cheap fallbacks for common collision suffixes if needed:
      if (!actual) {
        actual =
          baseToActual.get(`${base.toLowerCase()}-1`) ||
          baseToActual.get(`${base.toLowerCase()} (1)`);
      }
      // If still not found (e.g., export still running), keep the canonical guess
      p.exportedFilename = actual || exportedGuess || `${base}.jpg`;

      /* normalise persons */
      p.persons = Array.isArray(p.persons) ? p.persons : [];

      p.personsData = p.persons.map((name) => {
        const slug = slugifyName(name);
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

    const statusHeader =
      (albumStatus && albumStatus.status) ||
      (await fs.pathExists(path.join(imagesDir, ".skipped-empty"))
        ? "skipped-empty"
        : null);
    if (statusHeader) {
      res.set("X-PF-Export-Status", statusHeader);
    }

    res.set("X-PF-Album-Count", String(photos.length));
    res.set("Link", `</api/albums/${albumUUID}/status>; rel="status"`);

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
    console.error("photos-controller error", { albumUUID, err });
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

export const prepareAlbumForExport = async (req, res) => {
  const albumUUID = req.params.albumUUID;
  try {
    await ensureRoots();
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(albumDir, "images");
    const exportBase = getExportBase(albumUUID);
    const libraryRoot = getLibraryRoot();

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

    const context = {
      albumUUID,
      albumDir,
      photosJSON,
      imagesDir,
      legacyImagesDir,
      exportBase,
      libraryRoot,
      python,
      pyExport,
      osxphotos,
    };

    await writeStatus(albumUUID, exportBase, {
      lastRequestedAt: new Date().toISOString(),
    });

    const job = ensureAlbumPrepared(context);
    job.catch((err) => {
      console.error("prepareAlbumForExport error:", err);
    });

    const status = await loadStatus(albumUUID, { exportBase, photosJSON });
    const retryAfterSeconds = Number.isFinite(status?.retryAfterSeconds)
      ? Math.max(1, Math.round(status.retryAfterSeconds))
      : 2;
    const httpStatus = status?.status === "ready" ? 200 : 202;
    res
      .status(httpStatus)
      .set("X-PF-Export-Status", status?.status || "running")
      .set("Link", `</api/albums/${albumUUID}/status>; rel="status"`)
      .set("Retry-After", String(retryAfterSeconds))
      .set("Cache-Control", "no-store")
      .json(status);
  } catch (err) {
    console.error("prepareAlbumForExport error", { albumUUID, err });
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};

