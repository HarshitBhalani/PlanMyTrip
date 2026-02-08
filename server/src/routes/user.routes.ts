import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/userPreference.controller";

const router = Router();

router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);

export default router;
