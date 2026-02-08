import { Router } from "express";
import {
  generateTrip,
  saveTrip,
  getMyTrips,
  getTripById,
  deleteTrip,
} from "../controllers/trip.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/generate", protect, generateTrip);
router.post("/save", protect, saveTrip);
router.get("/my-trips", protect, getMyTrips);
router.get("/:id", protect, getTripById);
router.delete("/:id", protect, deleteTrip);

export default router;
