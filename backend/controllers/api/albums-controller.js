// ./controllers/api/albums-controller.js

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { runPythonScript } from "../../utils/run-python-script.js";
import { Serializer } from "jsonapi-serializer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use singular 'album' as the type and prevent pluralization
const AlbumSerializer = new Serializer("album", {
  id: "uuid", // Use 'uuid' as the 'id' field
  attributes: ["title"],
  keyForAttribute: "camelCase",
  pluralizeType: false, // Add this line
});

export const getAlbumsData = async (req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "..", "data");
    const albumsPath = path.join(dataDir, "albums.json");
    const venvDir = path.join(__dirname, "..", "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "export_albums.py"
    );

    // Ensure data directory exists
    await fs.ensureDir(dataDir);

    // Check if albums.json exists
    if (!(await fs.pathExists(albumsPath))) {
      console.log("albums.json not found. Exporting albums using osxphotos...");

      // Export albums using the Python script
      await runPythonScript(pythonPath, scriptPath, [], albumsPath);
    }

    // Read albums data
    const albumsData = await fs.readJson(albumsPath);

    // Serialize data
    const jsonApiData = AlbumSerializer.serialize(albumsData);

    // Send JSON response
    res.json(jsonApiData);
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ errors: [{ detail: "Internal Server Error" }] });
  }
};
