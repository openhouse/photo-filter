// backend/controllers/api/albums-controller.js
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { Serializer } from "jsonapi-serializer";
import { refreshAlbumIncremental } from "../../utils/refresh-album.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "..", "data");
const albumsJsonPath = path.join(dataDir, "albums.json");

const AlbumSerializer = new Serializer("album", {
  id: "uuid",
  attributes: ["title", "dataVersion", "scoreHash", "isStale"],
  keyForAttribute: "camelCase",
  pluralizeType: false,
});

/* ------ helpers ------ */
async function loadAlbums() {
  return (await fs.readJson(albumsJsonPath)).map((a) => ({
    ...a,
    isStale: !!a.isStale,
  }));
}
async function saveAlbums(albums) {
  await fs.writeJson(albumsJsonPath, albums, { spaces: 2 });
}

/* ------ routes ------ */

// GET /api/albums
export async function getAlbumsData(_req, res) {
  const albums = await loadAlbums();
  res.json(AlbumSerializer.serialize(albums));
}

// POST /api/albums/:albumUUID/refresh
export async function refreshAlbum(req, res) {
  try {
    const { albumUUID } = req.params;
    const result = await refreshAlbumIncremental(albumUUID);

    // mark album fresh
    const albums = await loadAlbums();
    const i = albums.findIndex((a) => a.uuid === albumUUID);
    if (i !== -1) {
      albums[i].dataVersion = new Date().toISOString();
      albums[i].scoreHash = result.staleScores
        ? Date.now().toString(36)
        : albums[i].scoreHash;
      albums[i].isStale = false;
      await saveAlbums(albums);
    }

    res.json(result);
  } catch (e) {
    console.error("refresh album error:", e);
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
}
