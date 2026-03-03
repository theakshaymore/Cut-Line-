import { QueueStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { joinQueue, leaveQueue } from "../services/queue.service.js";

export const joinSalonQueue = async (req, res) => {
  try {
    const { salonId, service } = req.body;
    const entry = await joinQueue({
      customerId: req.user.userId,
      salonId,
      service,
      io: req.app.get("io"),
    });
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const getMyQueueStatus = async (req, res) => {
  try {
    const entry = await prisma.queueEntry.findFirst({
      where: {
        customerId: req.user.userId,
        status: { in: [QueueStatus.waiting, QueueStatus.called, QueueStatus.seated] },
      },
      include: {
        salon: { select: { id: true, name: true, avgServiceTime: true } },
      },
      orderBy: { joinedAt: "desc" },
    });
    if (!entry) return res.json({ entry: null });
    return res.json({ entry });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const leaveSalonQueue = async (req, res) => {
  try {
    await leaveQueue({
      customerId: req.user.userId,
      io: req.app.get("io"),
    });
    return res.json({ message: "Queue left successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
