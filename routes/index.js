import express from "express";
import { getPhotos } from "../controllers/photoController.js";

const router = express.Router();

// Route for the homepage
router.get("/", getPhotos);

export default router;
