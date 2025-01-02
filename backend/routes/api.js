// backend/routes/api.js

import express from "express";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
} from "../controllers/api/index.js";
import {
  getPeopleInAlbum,
  getPhotosByPerson,
} from "../controllers/api/people-controller.js";

// IMPORTANT: Fixed import path to include the "api/" subfolder
import datesRouter from "./api/dates.js";

const apiRouter = express.Router();

// API route to get all albums
apiRouter.get("/albums", getAlbumsData);

// API route to get a single album by UUID
apiRouter.get("/albums/:albumUUID", getAlbumById);

// API route to get photos by album UUID
apiRouter.get("/albums/:albumUUID/photos", getPhotosByAlbumData);

// API routes for people in an album
apiRouter.get("/albums/:albumUUID/persons", getPeopleInAlbum);
apiRouter.get("/albums/:albumUUID/person/:personName", getPhotosByPerson);

// ====== NEW: MOUNT /api/dates ======
apiRouter.use("/dates", datesRouter);

export default apiRouter;
