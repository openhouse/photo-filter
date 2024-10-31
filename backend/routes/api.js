// ./routes/api.js

import express from "express";
import {
  getAlbumsData,
  getPhotosByAlbumData,
} from "../controllers/api-controller.js";

const apiRouter = express.Router();

// API route to get all albums
apiRouter.get("/albums", getAlbumsData);

// API route to get photos by album UUID
apiRouter.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

export default apiRouter;
