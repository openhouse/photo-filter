import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import routes from "./routes/index.js";
import cors from "cors";
import {
  ensureRoots,
  getLocalRoot,
  getExportRoot,
} from "./config/storage-paths.js";
import { getPeopleByFilename } from "./controllers/api/filename-controller.js";
import { createImagesMiddleware } from "./middleware/images.js";

const app = express();

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));
app.set("etag", "strong");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await ensureRoots();
console.log("Storage roots", {
  localRoot: getLocalRoot(),
  exportRoot: getExportRoot(),
});

app.use(cors());

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
          obj,
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
      args.pop();
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

app.use(express.static(path.join(__dirname, "public")));

app.use("/data/albums", express.static(path.join(getLocalRoot(), "albums")));

app.get("/images/:albumUUID/:imageName", createImagesMiddleware());

// Query variant forwards to the same controller
app.get("/api/people/by-filename", (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    res.set("X-PF-Resolve", "invalid");
    return res
      .status(400)
      .json({ errors: [{ detail: "Filename is required" }] });
  }
  req.params = { ...(req.params || {}), filename: String(filename) };
  return getPeopleByFilename(req, res);
});

app.use("/", routes);

app.use("/api", (_req, res) => {
  res
    .status(404)
    .type("application/json")
    .send({ errors: [{ detail: "Not Found" }] });
});

export { app };
export default app;
