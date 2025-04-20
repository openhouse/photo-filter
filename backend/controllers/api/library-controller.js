// backend/controllers/api/library-controller.js
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const albumsJsonPath = path.join(__dirname, "..", "..", "data", "albums.json");

let cache = { ts: 0, stale: [], hash: null };

export async function getLibraryStatus(_req, res) {
  const now = Date.now();
  if (now - cache.ts < 60000) {
    return res.json({
      staleAlbums: cache.stale,
      globalScoresHash: cache.hash,
    });
  }
  if (!(await fs.pathExists(albumsJsonPath))) {
    return res.json({ staleAlbums: [], globalScoresHash: null });
  }
  const albums = await fs.readJson(albumsJsonPath);
  cache.stale = albums.filter((a) => a.isStale).map((a) => a.uuid);
  cache.hash = albums
    .map((a) => a.scoreHash || "")
    .join("")
    .slice(0, 32);
  cache.ts = now;

  res.json({ staleAlbums: cache.stale, globalScoresHash: cache.hash });
}
