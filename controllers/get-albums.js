// ./controllers/get-albums.js

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { runPythonScript } from "../utils/run-python-script.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get the list of albums
export const getAlbums = async (req, res) => {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    const albumsPath = path.join(dataDir, "albums.json");
    const venvDir = path.join(__dirname, "..", "venv");
    const pythonPath = path.join(venvDir, "bin", "python3");
    const scriptPath = path.join(
      __dirname,
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

    // Render albums view
    res.render("albums", { albums: albumsData });
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).send("Internal Server Error");
  }
};
