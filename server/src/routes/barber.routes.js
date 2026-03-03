import { Router } from "express";
import {
  assignChair,
  getBarberQueue,
  markDone,
  markEntryNoShow,
  markIdle,
} from "../controllers/barber.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isBarber } from "../middleware/role.middleware.js";

const router = Router();

router.use(authMiddleware, isBarber);
router.get("/queue", getBarberQueue);
router.patch("/chair/:chairId/assign", assignChair);
router.patch("/chair/:chairId/done", markDone);
router.patch("/chair/:chairId/idle", markIdle);
router.patch("/queue/:entryId/noshow", markEntryNoShow);

export default router;
