import { Router } from "express";
import {
  getMyQueueStatus,
  joinSalonQueue,
  leaveSalonQueue,
} from "../controllers/queue.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isCustomer } from "../middleware/role.middleware.js";

const router = Router();

router.use(authMiddleware, isCustomer);
router.post("/join", joinSalonQueue);
router.get("/my-status", getMyQueueStatus);
router.delete("/leave", leaveSalonQueue);

export default router;
