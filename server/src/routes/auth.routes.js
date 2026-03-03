import { Router } from "express";
import {
  barberRegister,
  login,
  register,
  sendInvite,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/barber-register/:token", authLimiter, barberRegister);
router.post("/admin/send-invite", sendInvite);

export default router;
