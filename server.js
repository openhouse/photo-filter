// ./server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";

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
app.use("/images/:albumUUID/:imageName", (req, res) => {
  const { albumUUID, imageName } = req.params;
  const imagePath = path.join(
    __dirname,
    "data",
    "albums",
    albumUUID,
    "images",
    imageName
  );
  res.sendFile(imagePath);
});

// Use routes
app.use("/", routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
