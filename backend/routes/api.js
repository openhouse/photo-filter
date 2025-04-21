// backend/routes/api.js
import express from "express";
import {
  getAlbumsData,
  getAlbumById, // ← NEW import
  refreshAlbum,
} from "../controllers/api/albums-controller.js";
import { getPhotosByAlbumData } from "../controllers/api/photos-controller.js";
import { getLibraryStatus } from "../controllers/api/library-controller.js";
import { getTimeIndex } from "../controllers/api/time-controller.js";

const router = express.Router();

/* Albums */
router.get("/albums", getAlbumsData);
router.get("/albums/:albumUUID", getAlbumById); // ← NEW route

/* 🔄  Incremental sync */
router.post("/albums/:albumUUID/refresh", refreshAlbum);
router.post("/albums/:albumUUID/sync", refreshAlbum); // alias

/* Photos within an album */
router.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

/* Time taxonomy & library status */
router.get("/time-index", getTimeIndex);
router.get("/library/status", getLibraryStatus);

export default router;
