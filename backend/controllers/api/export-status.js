import path from "path";
import { fileURLToPath } from "url";
import { ensureRoots, getExportBase } from "../../config/storage-paths.js";
import { loadStatus } from "../../utils/export-status.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getAlbumExportStatus(req, res) {
  try {
    const albumUUID = req.params.albumUUID;
    await ensureRoots();

    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumDir = path.join(dataDir, "albums", albumUUID);
    const photosJSON = path.join(albumDir, "photos.json");
    const exportBase = getExportBase(albumUUID);

    const status = await loadStatus(albumUUID, { exportBase, photosJSON });
    if (Number.isFinite(status?.retryAfterSeconds)) {
      res.set("Retry-After", String(Math.max(1, Math.round(status.retryAfterSeconds))));
    }
    res.set("Cache-Control", "no-store");
    res.json(status);
  } catch (err) {
    console.error("getAlbumExportStatus error:", err);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}
