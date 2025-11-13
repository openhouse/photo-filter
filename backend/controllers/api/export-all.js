import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import pLimit from "p-limit";
import {
  getAlbumImagesDir,
  getExportBase,
  ensureRoots,
  getLibraryRoot,
} from "../../config/storage-paths.js";
import { buildExportedFilename } from "../../utils/exported-filename.js";
import { ensureAlbumPrepared } from "../../utils/prepare-album.js";
import { ensureAlbumImageMaterialized } from "../../utils/materialize-album-image.js";
import { cloneFile } from "../../utils/clone-file.js";
import { getCloneConcurrency } from "../../config/concurrency.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function exportAll(req, res) {
  try {
    const albumUUID = req.params.albumUUID;
    const { persons = [] } = req.body || {};

    await ensureRoots();
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const imagesDir = getAlbumImagesDir(albumUUID);
    const legacyImagesDir = path.join(albumDir, "images");
    const exportBase = getExportBase(albumUUID);
    const libraryRoot = getLibraryRoot();

    console.log("exportAll paths:", { imagesDir, exportBase });

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

    await ensureAlbumPrepared({
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

    const photos = await fs.readJson(photosJSON);
    photos.forEach((photo) => {
      photo.exportedFilename = buildExportedFilename(photo);
    });

    let filtered = photos;
    if (persons.length > 0) {
      filtered = photos.filter((photo) => {
        const names = Array.isArray(photo.persons) ? photo.persons : [];
        return persons.every((name) => names.includes(name));
      });
    }

    await fs.ensureDir(exportBase);
    const albumAllDir = path.join(exportBase, "_all");
    await fs.ensureDir(albumAllDir);

    const limit = pLimit(getCloneConcurrency());
    const stats = {
      total: 0,
      cloned: 0,
      skipped: 0,
      missing: 0,
      errors: 0,
    };

    await Promise.all(
      filtered.map((photo) =>
        limit(async () => {
          if (!photo.exportedFilename) {
            return;
          }
          stats.total += 1;
          try {
            const materialized = await ensureAlbumImageMaterialized({
              albumUUID,
              exportedName: photo.exportedFilename,
              imagesDir,
              logger: console,
            });
            const src = materialized?.path || path.join(imagesDir, photo.exportedFilename);
            const exists = await fs.pathExists(src);
            if (!exists) {
              stats.missing += 1;
              console.warn("exportAll: source missing", {
                albumUUID,
                exportedName: photo.exportedFilename,
              });
              return;
            }

            const dest = path.join(albumAllDir, photo.exportedFilename);
            if (await fs.pathExists(dest)) {
              stats.skipped += 1;
              return;
            }

            const method = await cloneFile(src, dest, {
              logger: console,
              skipIfExists: true,
            });
            if (method !== "skip") {
              stats.cloned += 1;
            } else {
              stats.skipped += 1;
            }
          } catch (err) {
            stats.errors += 1;
            console.warn("exportAll: failed to clone", {
              albumUUID,
              exportedName: photo.exportedFilename,
              error: err?.message,
            });
          }
        }),
      ),
    );

    return res.json({
      message: `Exported ${filtered.length} photos to ${albumAllDir}`,
      stats,
    });
  } catch (err) {
    console.error("exportAll error:", err);
    return res
      .status(500)
      .json({ errors: [{ detail: "Internal Server Error" }] });
  }
}
