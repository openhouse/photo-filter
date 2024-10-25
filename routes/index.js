// ./routes/index.js

import express from "express";
import {
  getAlbums,
  getPhotosByAlbum,
} from "../controllers/photo-controller.js";

const router = express.Router();

// Route for the homepage - display albums
router.get("/", getAlbums);

// Route for displaying photos from a specific album
router.get("/album/:albumUUID", getPhotosByAlbum);

export default router;
