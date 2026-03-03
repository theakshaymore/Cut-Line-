import { QueueStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  assignNextToChair,
  markChairDone,
  markNoShow,
  setChairIdle,
} from "../services/queue.service.js";

export const getBarberQueue = async (req, res) => {
  try {
    const salon = await prisma.salon.findUnique({ where: { ownerId: req.user.userId } });
    if (!salon) return res.status(404).json({ message: "Salon not found." });

    const queue = await prisma.queueEntry.findMany({
      where: { salonId: salon.id, status: { in: [QueueStatus.waiting, QueueStatus.seated] } },
      orderBy: [{ status: "asc" }, { position: "asc" }],
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedChair: true,
      },
    });
    return res.json(queue);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const assignChair = async (req, res) => {
  try {
    const result = await assignNextToChair({
      chairId: req.params.chairId,
      barberId: req.user.userId,
      io: req.app.get("io"),
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const markDone = async (req, res) => {
  try {
    await markChairDone({
      chairId: req.params.chairId,
      barberId: req.user.userId,
      io: req.app.get("io"),
    });
    return res.json({ message: "Marked done." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const markIdle = async (req, res) => {
  try {
    const chair = await setChairIdle({
      chairId: req.params.chairId,
      barberId: req.user.userId,
      io: req.app.get("io"),
    });
    return res.json(chair);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const markEntryNoShow = async (req, res) => {
  try {
    await markNoShow({
      entryId: req.params.entryId,
      barberId: req.user.userId,
      io: req.app.get("io"),
    });
    return res.json({ message: "No-show marked." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
