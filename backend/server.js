// backend/server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";
import fs from "fs-extra";
import cors from "cors"; // Import cors
import {
  ensureRoots,
  getLocalRoot,
  getExportRoot,
} from "./config/storage-paths.js";

const app = express();

// Basic body parsing for JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await ensureRoots();
console.log("Storage roots", {
  localRoot: getLocalRoot(),
  exportRoot: getExportRoot(),
});

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

// Dynamic image serving middleware with fuzzy fallback
app.use("/images/:albumUUID/:imageName", async (req, res) => {
  const { albumUUID, imageName } = req.params;
  const imagesDir = path.join(__dirname, "data", "albums", albumUUID, "images");

  try {
    const exact = path.join(imagesDir, imageName);
    if (await fs.pathExists(exact)) return res.sendFile(exact);

    // Fallback: ignore microseconds; match by seconds + original name (+ common collision suffixes)
    const want = imageName.replace(/\.[^.]+$/, "").toLowerCase(); // strip extension
    const dash = want.indexOf("-");
    if (dash > 0) {
      const wantSeconds = want.slice(0, dash).slice(0, 15); // YYYYMMDDTHHMMSS
      const wantTail = want.slice(dash + 1); // "IMG_1079" / "IMG_1079-1" / "IMG_1079 (1)"

      const files = await fs.readdir(imagesDir);
      const candidate = files.find((f) => {
        const b = f.replace(/\.[^.]+$/, "").toLowerCase();
        const d2 = b.indexOf("-");
        if (d2 < 0) return false;
        const sec = b.slice(0, d2).slice(0, 15); // seconds portion
        const tail = b.slice(d2 + 1);
        return (
          sec === wantSeconds &&
          (tail === wantTail ||
            tail.startsWith(wantTail + "-") ||
            tail.startsWith(wantTail + " (")
          )
        );
      });
      if (candidate) return res.sendFile(path.join(imagesDir, candidate));
    }

    console.warn(`[images] 404 ${albumUUID}/${imageName}`);
    res.status(404).send("Image not found");
  } catch (err) {
    console.error("Error serving image:", err);
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
