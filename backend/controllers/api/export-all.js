import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { runPythonScript } from '../../utils/run-python-script.js';
import { runOsxphotosExportImages } from '../../utils/export-images.js';
import {
  getAlbumImagesDir,
  getExportBase,
  ensureRoots,
} from '../../config/storage-paths.js';
import { formatPreciseTimestamp } from '../../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function exportAll(req, res) {
  try {
    const albumUUID = req.params.albumUUID;
    const { persons = [] } = req.body || {};

    await ensureRoots();
    const dataDir = path.join(__dirname, '..', '..', 'data');
    const albumDir = path.join(dataDir, 'albums', albumUUID);
    const photosJSON = path.join(albumDir, 'photos.json');
    const imagesDir = getAlbumImagesDir(albumUUID);
    const exportBase = getExportBase(albumUUID);

    console.log('exportAll paths:', { imagesDir, exportBase });

    const venvDir = path.join(__dirname, '..', '..', 'venv');
    const python = path.join(venvDir, 'bin', 'python3');
    const pyExport = path.join(
      __dirname,
      '..',
      '..',
      'scripts',
      'export_photos_in_album.py'
    );
    const osxphotos = path.join(venvDir, 'bin', 'osxphotos');

    await fs.ensureDir(imagesDir);
    if (!(await fs.pathExists(photosJSON))) {
      await runPythonScript(python, pyExport, [albumUUID], photosJSON);
      await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, photosJSON);
    }

    const photos = await fs.readJson(photosJSON);
    photos.forEach((photo) => {
      const originalName = path.parse(photo.original_filename).name;
      const ts = formatPreciseTimestamp(photo.date);
      photo.exportedFilename = `${ts}-${originalName}.jpg`;
    });

    let filtered = photos;
    if (persons.length > 0) {
      filtered = photos.filter((photo) => {
        const names = Array.isArray(photo.persons) ? photo.persons : [];
        return persons.every((name) => names.includes(name));
      });
    }

    await fs.ensureDir(exportBase);
    const albumAllDir = path.join(exportBase, '_all');
    await fs.ensureDir(albumAllDir);

    for (const photo of filtered) {
      if (!photo.exportedFilename) {
        continue;
      }
      const src = path.join(imagesDir, photo.exportedFilename);
      if (await fs.pathExists(src)) {
        const dest = path.join(albumAllDir, photo.exportedFilename);
        await fs.copy(src, dest);
      }
    }

    return res.json({
      message: `Exported ${filtered.length} photos to ${albumAllDir}`,
    });
  } catch (err) {
    console.error('exportAll error:', err);
    return res.status(500).json({ errors: [{ detail: 'Internal Server Error' }] });
  }
}
