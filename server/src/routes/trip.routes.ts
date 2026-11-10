import { Router } from "express";
import {
  generateTrip,
  previewTripDistance,
  saveTrip,
  getMyTrips,
  getTripById,
  deleteTrip,
  updateTrip,
  shareTrip,
  unshareTrip,
  getPublicTripBySlug,
} from "../controllers/trip.controller";
import { protect } from "../middleware/auth.middleware";
import {
  anonymousIpRateLimiter,
  attachRateLimitIdentity,
  authenticatedUserRateLimiter,
  burstRateLimiter,
  distancePreviewRateLimiter,
} from "../middleware/rateLimit.middleware";
import { validateGenerateTripRequest } from "../middleware/tripValidation.middleware";
import { validateObjectIdParam } from "../middleware/objectId.middleware";

const router = Router();
const validId = validateObjectIdParam("id");

router.post("/distance-preview", distancePreviewRateLimiter, previewTripDistance);
router.post(
  "/generate",
  attachRateLimitIdentity,
  burstRateLimiter,
  authenticatedUserRateLimiter,
  anonymousIpRateLimiter,
  protect,
  validateGenerateTripRequest,
  generateTrip
);
router.post("/save", protect, saveTrip);
router.get("/my-trips", protect, getMyTrips);
router.get("/public/:slug", getPublicTripBySlug);
router.post("/:id/share", protect, validId, shareTrip);
router.delete("/:id/share", protect, validId, unshareTrip);
router.get("/:id", protect, validId, getTripById);
router.put("/:id", protect, validId, updateTrip);
router.delete("/:id", protect, validId, deleteTrip);

export default router;
