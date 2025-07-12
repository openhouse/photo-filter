import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { runPythonScript } from '../../utils/run-python-script.js';
import { runOsxphotosExportImages } from '../../utils/export-images.js';
import { formatPreciseTimestamp, getNestedProperty } from '../../utils/helpers.js';
import { topUUIDsByAttributes } from '../../utils/top-uuids.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aesthetic score attributes to process
export const AESTHETIC_ATTRIBUTES = [
  'overall',
  'curation',
  'highlight_visibility',
  'behavioral',
  'harmonious_color',
  'immersiveness',
  'interaction',
  'interesting_subject',
  'pleasant_camera_tilt',
  'pleasant_composition',
  'pleasant_lighting',
  'pleasant_pattern',
  'pleasant_perspective',
  'pleasant_post_processing',
  'pleasant_reflection',
  'pleasant_symmetry',
  'sharply_focused_subject',
  'tastefully_blurred',
  'well_chosen_subject',
  'well_framed_subject',
  'well_timed_shot',
];

export async function exportTopN(req, res) {
  try {
    const albumUUID = req.params.albumUUID;
    const { n, persons = [] } = req.body || {};
    const topN = Math.max(parseInt(n, 10) || 1, 1);

    const dataDir = path.join(__dirname, '..', '..', 'data');
    const albumDir = path.join(dataDir, 'albums', albumUUID);
    const photosJSON = path.join(albumDir, 'photos.json');
    const imagesDir = path.join(albumDir, 'images');
    const exportBase = path.join(__dirname, '..', '..', 'exports', albumUUID);

    const venvDir = path.join(__dirname, '..', '..', 'venv');
    const python = path.join(venvDir, 'bin', 'python3');
    const pyExport = path.join(__dirname, '..', '..', 'scripts', 'export_photos_in_album.py');
    const osxphotos = path.join(venvDir, 'bin', 'osxphotos');

    await fs.ensureDir(imagesDir);
    if (!(await fs.pathExists(photosJSON))) {
      await runPythonScript(python, pyExport, [albumUUID], photosJSON);
      const allPhotos = await fs.readJson(photosJSON);
      const initial = topUUIDsByAttributes(allPhotos, AESTHETIC_ATTRIBUTES, 50);
      await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, initial);
    }

    const photos = await fs.readJson(photosJSON);
    photos.forEach((p) => {
      p.originalName = path.parse(p.original_filename).name;
      const ts = formatPreciseTimestamp(p.date);
      p.exportedFilename = `${ts}-${p.originalName}.jpg`;
    });

    let filtered = photos;
    if (persons.length > 0) {
      filtered = photos.filter((p) => {
        const names = Array.isArray(p.persons) ? p.persons : [];
        return persons.every((name) => names.includes(name));
      });
    }

    const personKey = persons.length > 0 ? persons.join('_') : 'all';
    const personDir = path.join(exportBase, personKey);
    await fs.ensureDir(personDir);

    const uniqueMap = new Map();

    for (const attr of AESTHETIC_ATTRIBUTES) {
      const scoreKey = `score.${attr}`;
      const sorted = [...filtered].sort((a, b) => {
        const va = getNestedProperty(a, scoreKey);
        const vb = getNestedProperty(b, scoreKey);
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        return vb - va;
      });
      const topPhotos = sorted.slice(0, topN);
      const attrDir = path.join(personDir, attr);
      await fs.ensureDir(attrDir);
      for (const photo of topPhotos) {
        const src = path.join(imagesDir, photo.exportedFilename);
        const dest = path.join(attrDir, photo.exportedFilename);
        if (!(await fs.pathExists(src))) {
          await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, [photo.uuid]);
        }
        if (await fs.pathExists(src)) {
          await fs.copy(src, dest);
          if (!uniqueMap.has(photo.exportedFilename)) {
            uniqueMap.set(photo.exportedFilename, src);
          }
        }
      }
    }

    // Save all unique photos for this person
    const personAllDir = path.join(personDir, '_all');
    await fs.ensureDir(personAllDir);
    for (const [filename, src] of uniqueMap.entries()) {
      const dest = path.join(personAllDir, filename);
      if (!(await fs.pathExists(dest))) {
        await fs.copy(src, dest);
      }
    }

    // Maintain album-wide _all directory with uniques from every person
    const albumAllDir = path.join(exportBase, '_all');
    await fs.ensureDir(albumAllDir);
    for (const [filename, src] of uniqueMap.entries()) {
      const dest = path.join(albumAllDir, filename);
      if (!(await fs.pathExists(dest))) {
        await fs.copy(src, dest);
      }
    }

    return res.json({ message: `Exported top ${topN} photos to ${personDir}` });
  } catch (err) {
    console.error('exportTopN error:', err);
    return res.status(500).json({ errors: [{ detail: 'Internal Server Error' }] });
  }
}
