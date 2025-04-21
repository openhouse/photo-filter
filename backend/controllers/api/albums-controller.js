// backend/controllers/api/albums-controller.js
//
// Handles album‑level metadata and incremental “refresh / sync”.
// Fully resilient on first‑run: if data/albums.json does not exist
// we return an empty list and create the file on first write.

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { Serializer } from "jsonapi-serializer";
import { refreshAlbumIncremental } from "../../utils/refresh-album.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Where we persist high‑level album info */
const albumsJsonPath = path.join(__dirname, "..", "..", "data", "albums.json");

/* ---------- JSON:API serialiser ---------- */
const AlbumSerializer = new Serializer("album", {
  id: "uuid",
  attributes: ["title", "dataVersion", "scoreHash", "isStale"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

/* ---------- helpers ---------- */
async function loadAlbums() {
  if (!(await fs.pathExists(albumsJsonPath))) {
    return []; // first run → empty list
  }
  // Ensure booleans stay booleans
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

/**
 * GET /api/albums
 * Returns an array of all albums in JSON:API format.
 */
export async function getAlbumsData(_req, res) {
  const albums = await loadAlbums();
  res.json(AlbumSerializer.serialize(albums));
}

/**
 * POST /api/albums/:albumUUID/refresh
 * POST /api/albums/:albumUUID/sync  (alias – see routes/api.js)
 *
 * Triggers a per‑album incremental sync and updates bookkeeping.
 */
export async function refreshAlbum(req, res) {
  try {
    const { albumUUID } = req.params;

    /* ---------- incremental refresh ---------- */
    const result = await refreshAlbumIncremental(albumUUID);

    /* ---------- update album metadata ---------- */
    const albums = await loadAlbums();
    const idx = albums.findIndex((a) => a.uuid === albumUUID);

    if (idx !== -1) {
      albums[idx].dataVersion = new Date().toISOString();
      if (result.staleScores) {
        // use something cheap for “changed” – the exact value is irrelevant
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

/* ---------- named export alias ---------- */
/** identical to refreshAlbum – kept for semantic clarity in callers */
export { refreshAlbum as syncAlbum };
