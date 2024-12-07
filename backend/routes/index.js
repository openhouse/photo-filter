// backend/routes/index.js

import express from "express";
import {
  getAlbums,
  getPhotosByAlbum,
} from "../controllers/photo-controller.js";
import apiRouter from "./api.js";
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

// Mount the API router under '/api'
router.use("/api", apiRouter);

export default router;
