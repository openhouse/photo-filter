import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { formatPreciseTimestamp } from "../../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getPeopleByFilename(req, res) {
  try {
    const { filename } = req.params;
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsDir = path.join(dataDir, "albums");

    if (!(await fs.pathExists(albumsDir))) {
      return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
    }

    const albumEntries = await fs.readdir(albumsDir, { withFileTypes: true });

    for (const entry of albumEntries) {
      if (!entry.isDirectory()) continue;
      const albumUUID = entry.name;
      const photosPath = path.join(albumsDir, albumUUID, "photos.json");
      if (!(await fs.pathExists(photosPath))) continue;

      const photos = await fs.readJson(photosPath);
      for (const photo of photos) {
        const originalName = path.parse(photo.original_filename).name;
        const ts = formatPreciseTimestamp(photo.date, photo.tzoffset);
        const exported = `${ts}-${originalName}.jpg`;

        if (exported === filename) {
          const persons = Array.isArray(photo.persons) ? photo.persons : [];
          return res.json({ data: persons });
        }
      }
    }

    return res.status(404).json({ errors: [{ detail: "Photo not found" }] });
  } catch (error) {
    console.error("Error looking up persons by filename:", error);
    return res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
}
