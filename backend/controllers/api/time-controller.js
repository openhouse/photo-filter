// backend/controllers/api/time-controller.js

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

/**
 * getTimeIndex
 *
 * Returns a hierarchical time-based index of all photos known to the system:
 *   {
 *     "years": [
 *       {
 *         "year": 2024,
 *         "months": [
 *           {
 *             "month": 12,
 *             "days": [5, 6, 7]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Only includes years/months/days that actually have photos. Does not currently handle weeks.
 */
export async function getTimeIndex(req, res) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const dataDir = path.join(__dirname, "..", "..", "data", "albums");
    // We'll iterate through all album folders, parse each photos.json,
    // and accumulate date info in a structured way.

    const yearMap = new Map();
    // yearMap[year] = {
    //   <monthNumber>: Set([dayNumbers]),
    //   ...
    // }

    const albumDirs = await fs.readdir(dataDir, { withFileTypes: true });

    for (const dirEnt of albumDirs) {
      if (!dirEnt.isDirectory()) continue;
      const albumUUID = dirEnt.name;
      const photosJsonPath = path.join(dataDir, albumUUID, "photos.json");

      if (!(await fs.pathExists(photosJsonPath))) {
        continue;
      }

      const photosData = await fs.readJson(photosJsonPath);
      for (const photo of photosData) {
        // Date parse
        const dateObj = new Date(photo.date);
        if (isNaN(dateObj.getTime())) {
          continue; // skip if invalid date
        }

        const y = dateObj.getFullYear();
        const m = dateObj.getMonth() + 1; // 1-based
        const d = dateObj.getDate();

        if (!yearMap.has(y)) {
          yearMap.set(y, new Map());
        }
        const monthMap = yearMap.get(y);

        if (!monthMap.has(m)) {
          monthMap.set(m, new Set());
        }
        const daySet = monthMap.get(m);
        daySet.add(d);
      }
    }

    // Now convert that Map-of-Maps-of-Sets into a JSON-friendly object
    const yearsArray = [];
    // Sort the years ascending, e.g., 2019, 2020, etc.
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

    for (const year of sortedYears) {
      const monthsArray = [];
      const monthMap = yearMap.get(year);

      // Sort months ascending
      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a - b);
      for (const month of sortedMonths) {
        const daysArray = Array.from(monthMap.get(month)).sort((a, b) => a - b);
        monthsArray.push({
          month,
          days: daysArray,
        });
      }

      yearsArray.push({
        year,
        months: monthsArray,
      });
    }

    const finalIndex = { years: yearsArray };

    return res.json(finalIndex);
  } catch (error) {
    console.error("Error building time index:", error);
    return res.status(500).json({ errors: [{ detail: error.message }] });
  }
}
