// backend/server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";
import fs from "fs-extra";
import cors from "cors"; // Import cors
import { runOsxphotosExportImages } from "./utils/export-images.js";
import { formatPreciseTimestamp } from "./utils/helpers.js";

const app = express();

// Basic body parsing for JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for all routes
app.use(cors());

// Set up Handlebars with custom helpers
const hbs = exphbs.create({
  extname: ".hbs",
  helpers: {
    eq: (a, b) => a === b,
    getNestedProperty: (obj, propertyPath) => {
      if (!propertyPath || typeof propertyPath !== "string") {
        return null;
      }
      return propertyPath
        .split(".")
        .reduce(
          (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
          obj
        );
    },
    capitalize: (str) => {
      if (typeof str !== "string") return "";
      return str
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },
    concat: (...args) => {
      args.pop(); // Remove Handlebars options object
      return args.join("");
    },
    replace: (str, find, replace) => {
      return str.replace(find, replace);
    },
  },
});

app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Dynamic image serving middleware
app.use("/images/:albumUUID/:imageName", async (req, res) => {
  const { albumUUID, imageName } = req.params;
  const imagesDir = path.join(__dirname, "data", "albums", albumUUID, "images");
  const photosPath = path.join(
    __dirname,
    "data",
    "albums",
    albumUUID,
    "photos.json"
  );
  const osxphotos = path.join(__dirname, "venv", "bin", "osxphotos");

  try {
    const imagePath = path.join(imagesDir, imageName);
    if (await fs.pathExists(imagePath)) {
      res.sendFile(imagePath);
    } else {
      if (await fs.pathExists(photosPath)) {
        const photos = await fs.readJson(photosPath);
        const match = photos.find((p) => {
          const name = `${formatPreciseTimestamp(p.date)}-${path.parse(p.original_filename).name}.jpg`;
          return name === imageName;
        });
        if (match) {
          await runOsxphotosExportImages(osxphotos, albumUUID, imagesDir, [match.uuid]);
          if (await fs.pathExists(imagePath)) {
            return res.sendFile(imagePath);
          }
        }
      }
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Use routes
app.use("/", routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
