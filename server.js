// ./server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";
import fs from "fs-extra";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Handlebars
app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Dynamic image serving middleware
app.use("/images/:albumUUID/:imageName", async (req, res) => {
  const { albumUUID, imageName } = req.params;
  const imagesDir = path.join(__dirname, "data", "albums", albumUUID, "images");

  try {
    const imagePath = path.join(imagesDir, imageName);
    if (await fs.pathExists(imagePath)) {
      res.sendFile(imagePath);
    } else {
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
