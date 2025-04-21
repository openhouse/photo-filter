// backend/controllers/api/time-controller.js
//
// Builds a Year ➝ Month ➝ Day index of all photos.
// Now safe on a totally empty data directory.

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

export async function getTimeIndex(_req, res) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const albumsRoot = path.join(__dirname, "..", "..", "data", "albums");

    /* ---------- first‑run guard ---------- */
    if (!(await fs.pathExists(albumsRoot))) {
      return res.json({ years: [] }); // nothing to index yet
    }

    /* ---------- walk all albums ---------- */
    const yearMap = new Map(); // {year → Map(month → Set(days))}
    const albumDirs = await fs.readdir(albumsRoot, { withFileTypes: true });

    for (const dirEnt of albumDirs) {
      if (!dirEnt.isDirectory()) continue;

      const photosJson = path.join(albumsRoot, dirEnt.name, "photos.json");
      if (!(await fs.pathExists(photosJson))) continue;

      const photos = await fs.readJson(photosJson);
      for (const p of photos) {
        const d = new Date(p.date);
        if (Number.isNaN(d.getTime())) continue;

        const y = d.getFullYear();
        const m = d.getMonth() + 1; // 1‑based
        const day = d.getDate();

        if (!yearMap.has(y)) yearMap.set(y, new Map());
        const monthMap = yearMap.get(y);
        if (!monthMap.has(m)) monthMap.set(m, new Set());
        monthMap.get(m).add(day);
      }
    }

    /* ---------- serialise ---------- */
    const years = [...yearMap.keys()]
      .sort((a, b) => a - b)
      .map((y) => {
        const months = [...yearMap.get(y).keys()]
          .sort((a, b) => a - b)
          .map((m) => ({
            month: m,
            days: [...yearMap.get(y).get(m)].sort((a, b) => a - b),
          }));
        return { year: y, months };
      });

    res.json({ years });
  } catch (err) {
    console.error("Error building time index:", err);
    res.status(500).json({ errors: [{ detail: err.message }] });
  }
}
