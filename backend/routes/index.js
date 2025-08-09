// backend/routes/index.js

import express from "express";
import {
  getAlbums,
  getPhotosByAlbum,
} from "../controllers/photo-controller.js";
import apiRouter from "./api.js";
import pRouter from "./p.js";
import primeRouter from "./prime.js";
import {
  getPeopleInAlbumLegacy,
  getPhotosByPersonLegacy,
} from "../controllers/people-legacy-controller.js";

const router = express.Router();

// Existing routes for the legacy UI
router.get("/", getAlbums);
router.get("/album/:albumUUID", getPhotosByAlbum);

// New legacy routes for persons
router.get("/album/:albumUUID/persons", getPeopleInAlbumLegacy);
router.get("/album/:albumUUID/person/:personName", getPhotosByPersonLegacy);

// Mount routers
router.use("/api", apiRouter);
router.use("/p", pRouter);
router.use("/prime", primeRouter);

export default router;
