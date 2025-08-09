// backend/server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";
import cors from "cors";
import { ensureFilenameIndexFresh } from "./utils/index-refresh.js";

const app = express();
app.use(
  cors({ origin: ["http://localhost:4200", "http://127.0.0.1:4200"] })
);

// Basic body parsing for JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Use routes
app.use("/", routes);

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

await ensureFilenameIndexFresh();
setInterval(ensureFilenameIndexFresh, 10 * 60 * 1000);

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
