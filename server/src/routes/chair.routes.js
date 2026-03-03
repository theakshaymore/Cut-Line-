import { Router } from "express";
import { createChair, deleteChair, getChairs } from "../controllers/chair.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isBarber } from "../middleware/role.middleware.js";

const router = Router();

router.use(authMiddleware, isBarber);
router.get("/chairs", getChairs);
router.post("/chairs", createChair);
router.delete("/chairs/:id", deleteChair);

export default router;
