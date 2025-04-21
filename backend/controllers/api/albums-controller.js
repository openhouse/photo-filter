// backend/controllers/api/albums-controller.js
//
// Album‑level JSON:API endpoints + incremental refresh.
//
//  • GET  /api/albums                – list all albums
//  • GET  /api/albums/:albumUUID     – single album record   ◀︎ NEW
//  • POST /api/albums/:albumUUID/sync   (alias /refresh)     – incremental sync

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { Serializer } from "jsonapi-serializer";
import { refreshAlbumIncremental } from "../../utils/refresh-album.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- storage ---------- */
const albumsJsonPath = path.join(__dirname, "..", "..", "data", "albums.json");

/* ---------- serializer ---------- */
const AlbumSerializer = new Serializer("album", {
  id: "uuid",
  attributes: ["title", "dataVersion", "scoreHash", "isStale"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

/* ---------- helpers ---------- */
async function loadAlbums() {
  if (!(await fs.pathExists(albumsJsonPath))) return [];
  return (await fs.readJson(albumsJsonPath)).map((a) => ({
    ...a,
    isStale: Boolean(a.isStale),
  }));
}

async function saveAlbums(albums) {
  await fs.ensureFile(albumsJsonPath);
  await fs.writeJson(albumsJsonPath, albums, { spaces: 2 });
}

/* ---------- route handlers ---------- */

// GET /api/albums
export async function getAlbumsData(_req, res) {
  res.json(AlbumSerializer.serialize(await loadAlbums()));
}

// GET /api/albums/:albumUUID   ← needed by Ember Data
export async function getAlbumById(req, res) {
  const { albumUUID } = req.params;
  const albums = await loadAlbums();
  const album = albums.find((a) => a.uuid === albumUUID);

  if (!album) {
    return res
      .status(404)
      .json({ errors: [{ detail: `Album ${albumUUID} not found` }] });
  }
  res.json(AlbumSerializer.serialize(album));
}

// POST /api/albums/:albumUUID/sync  (alias /refresh)
export async function refreshAlbum(req, res) {
  try {
    const { albumUUID } = req.params;

    /* 1️⃣  incremental refresh */
    const result = await refreshAlbumIncremental(albumUUID);

    /* 2️⃣  update stored album metadata */
    const albums = await loadAlbums();
    const idx = albums.findIndex((a) => a.uuid === albumUUID);

    if (idx !== -1) {
      albums[idx].dataVersion = new Date().toISOString();
      if (result.staleScores) {
        albums[idx].scoreHash = Date.now().toString(36);
      }
      albums[idx].isStale = false;
      await saveAlbums(albums);
    }

    res.json(result);
  } catch (err) {
    console.error("refresh album error:", err);
    res.status(500).json({ errors: [{ detail: err.message }] });
  }
}

/* alias so callers can `syncAlbum` */
export { refreshAlbum as syncAlbum };
