// backend/routes/api.js

import express from "express";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
} from "../controllers/api/index.js";

const apiRouter = express.Router();

// API route to get all albums
apiRouter.get("/albums", getAlbumsData);

// API route to get a single album by UUID
apiRouter.get("/albums/:albumUUID", getAlbumById);

// API route to get photos by album UUID
apiRouter.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

export default apiRouter;
