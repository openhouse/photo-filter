// ./routes/index.js

import express from "express";
import {
  getAlbums,
  getPhotosByAlbum,
} from "../controllers/photo-controller.js";
import apiRouter from "./api.js";

const router = express.Router();

// Existing routes for the legacy UI
router.get("/", getAlbums);
router.get("/album/:albumUUID", getPhotosByAlbum);

// Mount the API router under '/api'
router.use("/api", apiRouter);

export default router;
