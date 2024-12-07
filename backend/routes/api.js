// backend/routes/api.js

import express from "express";
import {
  getAlbumsData,
  getAlbumById,
  getPhotosByAlbumData,
} from "../controllers/api/index.js";

// Import the new people controllers
import {
  getPeopleInAlbum,
  getPhotosByPerson,
} from "../controllers/api/people-controller.js";

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

export default apiRouter;
