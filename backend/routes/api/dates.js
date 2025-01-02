// backend/routes/api/dates.js
import express from "express";
import {
  listAllDates,
  getPhotosByYear,
  getPhotosByYearMonth,
  getPhotosByYearMonthDay,
} from "../../controllers/api/dates-controller.js";

const datesRouter = express.Router();

// GET /api/dates
datesRouter.get("/", listAllDates);
// GET /api/dates/:year
datesRouter.get("/:year", getPhotosByYear);
// GET /api/dates/:year/:month
datesRouter.get("/:year/:month", getPhotosByYearMonth);
// GET /api/dates/:year/:month/:day
datesRouter.get("/:year/:month/:day", getPhotosByYearMonthDay);

export default datesRouter;
