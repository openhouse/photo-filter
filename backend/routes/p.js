// backend/routes/p.js
import express from "express";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { lookupUuidByExportedFilename } from "../utils/lookup-uuid-from-exported.js";
import { exportByUuids } from "../utils/export-by-uuid.js";
import { queue } from "../utils/job-queue.js";
import { emit } from "../utils/sse.js";

const router = express.Router();

export async function handle(req, res) {
  try {
    const { file } = req.params;
    if (!/^[0-9]{8}T[0-9]{6}[0-9]{6}Z-.+\.jpg$/i.test(file)) {
      return res.status(400).end();
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const cacheDir =
      process.env.CACHE_DIR ||
      path.join(__dirname, "..", "data", "cache", "images");
    const absPath = path.join(cacheDir, file);

    if (await fs.pathExists(absPath)) {
      console.log("media_hit", file);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Content-Type", "image/jpeg");
      if (req.method === "HEAD") {
        return res.status(200).end();
      }
      return res.sendFile(absPath);
    }

    const uuid = await lookupUuidByExportedFilename(file);
    if (!uuid) {
      console.log("media_miss_unknown", file);
      return res.status(404).set("Retry-After", "4").end();
    }
    if (Array.isArray(uuid)) {
      console.warn(`filename collision for ${file}: ${uuid.join(",")}`);
      return res.status(409).end();
    }

    const venvDir = path.join(__dirname, "..", "venv");
    const osxphotos =
      process.env.OSXPHOTOS_BIN || path.join(venvDir, "bin", "osxphotos");

    queue.enqueue(uuid, async () => {
      await exportByUuids(osxphotos, cacheDir, [uuid]);
      try {
        emit("image-ready", { exportedFilename: file });
      } catch {
        /* no-op */
      }
    });
    console.log("media_miss_enqueued", file, queue.q?.length);
    return res.status(404).set("Retry-After", "2").end();
  } catch (e) {
    console.error("media proxy error:", e);
    return res.status(500).end();
  }
}

router.get("/:file", handle);
router.head("/:file", handle);

export default router;
