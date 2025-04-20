// backend/routes/api.js
import express from "express";
import {
  getAlbumsData,
  refreshAlbum,
} from "../controllers/api/albums-controller.js";
import { getPhotosByAlbumData } from "../controllers/api/photos-controller.js";
import { getLibraryStatus } from "../controllers/api/library-controller.js";
import { getTimeIndex } from "../controllers/api/time-controller.js";

const router = express.Router();

/* Albums */
router.get("/albums", getAlbumsData);
router.post("/albums/:albumUUID/refresh", refreshAlbum);
router.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

/* Time taxonomy */
router.get("/time-index", getTimeIndex);

/* Library‑wide status */
router.get("/library/status", getLibraryStatus);

export default router;
