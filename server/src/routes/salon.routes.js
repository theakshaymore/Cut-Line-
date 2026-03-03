import { Router } from "express";
import { getSalonById, listSalons } from "../controllers/salon.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, listSalons);
router.get("/:id", authMiddleware, getSalonById);

export default router;
