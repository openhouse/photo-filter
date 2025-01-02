// backend/controllers/api/dates-controller.js
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { getNestedProperty } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Retrieve a hierarchical object of all photos grouped by [year][month][day].
 *
 * Example output shape:
 * {
 *   "2022": {
 *     "11": {
 *       "30": [ { photoObject }, { photoObject }, ... ],
 *       "31": [ ... ]
 *     },
 *     "12": { ... }
 *   },
 *   "2023": { ... },
 *   ...
 * }
 */
export async function getAllPhotosGroupedByDate() {
  const dataDir = path.join(__dirname, "..", "..", "data", "albums");
  if (!(await fs.pathExists(dataDir))) {
    // If there's no data at all, return empty
    return {};
  }

  const albumFolders = await fs.readdir(dataDir);
  const grouped = {};

  // Traverse each album folder to find `photos.json`. Merge all photos into one big set.
  for (const albumFolder of albumFolders) {
    const photosJsonPath = path.join(dataDir, albumFolder, "photos.json");
    const stat = await fs.stat(path.join(dataDir, albumFolder));
    if (stat.isDirectory() && (await fs.pathExists(photosJsonPath))) {
      const photosData = await fs.readJson(photosJsonPath);
      for (const photo of photosData) {
        // Parse the date field: e.g. "2024-12-09 21:54:43-05:00"
        let dateObj;
        try {
          dateObj = new Date(photo.date);
        } catch {
          continue; // skip if date is invalid
        }

        const year = String(dateObj.getFullYear());
        // getMonth() is 0-based, so add 1
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");

        if (!grouped[year]) {
          grouped[year] = {};
        }
        if (!grouped[year][month]) {
          grouped[year][month] = {};
        }
        if (!grouped[year][month][day]) {
          grouped[year][month][day] = [];
        }
        grouped[year][month][day].push(photo);
      }
    }
  }

  return grouped;
}

/** GET /api/dates
 * Returns the entire year-month-day nested structure (without the actual photos array for every day).
 * Instead we return only counts at each node, so the frontend can build a collapsible tree
 * without fetching every single photo upfront.
 */
export async function listAllDates(req, res) {
  try {
    const grouped = await getAllPhotosGroupedByDate();
    // Build a minimal structure containing only {count: n, children} to keep the payload small
    const summary = {};

    for (const year of Object.keys(grouped)) {
      summary[year] = {
        count: 0,
        months: {},
      };
      for (const month of Object.keys(grouped[year])) {
        summary[year].months[month] = {
          count: 0,
          days: {},
        };
        for (const day of Object.keys(grouped[year][month])) {
          const dayPhotos = grouped[year][month][day];
          summary[year].months[month].days[day] = {
            count: dayPhotos.length,
          };
          // add to the parent's total
          summary[year].months[month].count += dayPhotos.length;
          summary[year].count += dayPhotos.length;
        }
      }
    }

    res.json({ data: summary });
  } catch (error) {
    console.error("Error listing all dates:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

/** GET /api/dates/:year
 * Return all photos for that entire year.
 */
export async function getPhotosByYear(req, res) {
  try {
    const year = req.params.year;
    const grouped = await getAllPhotosGroupedByDate();
    if (!grouped[year]) {
      return res.json({ data: [] });
    }
    // Flatten all months/days for that year
    let photos = [];
    for (const month of Object.keys(grouped[year])) {
      for (const day of Object.keys(grouped[year][month])) {
        photos = photos.concat(grouped[year][month][day]);
      }
    }
    res.json({ data: photos });
  } catch (error) {
    console.error("Error getting photos by year:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

/** GET /api/dates/:year/:month
 * Return all photos for that year+month.
 */
export async function getPhotosByYearMonth(req, res) {
  try {
    const { year, month } = req.params;
    const grouped = await getAllPhotosGroupedByDate();
    if (!grouped[year] || !grouped[year][month]) {
      return res.json({ data: [] });
    }
    let photos = [];
    for (const day of Object.keys(grouped[year][month])) {
      photos = photos.concat(grouped[year][month][day]);
    }
    res.json({ data: photos });
  } catch (error) {
    console.error("Error getting photos by year+month:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}

/** GET /api/dates/:year/:month/:day
 * Return all photos for that specific day.
 */
export async function getPhotosByYearMonthDay(req, res) {
  try {
    const { year, month, day } = req.params;
    const grouped = await getAllPhotosGroupedByDate();
    if (!grouped[year] || !grouped[year][month] || !grouped[year][month][day]) {
      return res.json({ data: [] });
    }
    const photos = grouped[year][month][day];
    res.json({ data: photos });
  } catch (error) {
    console.error("Error getting photos by day:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}
