// backend/routes/prime.js
import express from "express";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { lookupUuidByExportedFilename } from "../utils/lookup-uuid-from-exported.js";
import { exportByUuids } from "../utils/export-by-uuid.js";
import { queue } from "../utils/job-queue.js";
import { emit } from "../utils/sse.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { filenames } = req.body || {};
    if (!Array.isArray(filenames)) {
      return res.status(400).json({ error: "filenames must be an array" });
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const cacheDir =
      process.env.CACHE_DIR ||
      path.join(__dirname, "..", "data", "cache", "images");
    const venvDir = path.join(__dirname, "..", "venv");
    const osxphotos =
      process.env.OSXPHOTOS_BIN || path.join(venvDir, "bin", "osxphotos");
    let enqueued = 0;
    for (const file of filenames) {
      if (!/^[0-9]{8}T[0-9]{6}[0-9]{6}Z-.+\.jpg$/i.test(file)) continue;
      const absPath = path.join(cacheDir, file);
      if (await fs.pathExists(absPath)) continue;
      const uuid = await lookupUuidByExportedFilename(file);
      if (!uuid || Array.isArray(uuid)) continue;
      queue.enqueue(uuid, async () => {
        await exportByUuids(osxphotos, cacheDir, [uuid]);
        try {
          emit("image-ready", { exportedFilename: file });
        } catch {
          /* no-op */
        }
      });
      enqueued++;
    }
    return res.json({ enqueued });
  } catch (e) {
    console.error("prime error:", e);
    return res.status(500).end();
  }
});

export default router;
