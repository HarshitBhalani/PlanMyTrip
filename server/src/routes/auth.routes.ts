import { Router } from "express";
import { signup, login, logout, me } from "../controllers/auth.controller";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", authRateLimiter, signup);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;
