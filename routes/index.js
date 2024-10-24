import express from "express";
import { getPhotos } from "../controllers/photo-controller.js";

const router = express.Router();

// Route for the homepage
router.get("/", getPhotos);

export default router;
