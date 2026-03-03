import { prisma } from "../lib/prisma.js";
import { cacheChairs } from "../services/redis.service.js";

const getSalonForBarber = async (barberId) => {
  return prisma.salon.findUnique({ where: { ownerId: barberId } });
};

export const getChairs = async (req, res) => {
  try {
    const salon = await getSalonForBarber(req.user.userId);
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    const chairs = await prisma.chair.findMany({
      where: { salonId: salon.id },
      include: { currentEntry: { include: { customer: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.json(chairs);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const createChair = async (req, res) => {
  try {
    const salon = await getSalonForBarber(req.user.userId);
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    const chair = await prisma.chair.create({
      data: {
        salonId: salon.id,
        label: req.body.label,
      },
    });
    await cacheChairs(salon.id, await prisma.chair.findMany({ where: { salonId: salon.id } }));
    req.app.get("io").to(`salon:${salon.id}`).emit("chair-updated", {
      chairId: chair.id,
      status: chair.status,
      currentCustomer: null,
    });
    return res.status(201).json(chair);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export const deleteChair = async (req, res) => {
  try {
    const salon = await getSalonForBarber(req.user.userId);
    if (!salon) return res.status(404).json({ message: "Salon not found." });
    const chair = await prisma.chair.findUnique({ where: { id: req.params.id } });
    if (!chair || chair.salonId !== salon.id) {
      return res.status(404).json({ message: "Chair not found." });
    }
    if (chair.currentQueueEntryId) {
      return res.status(400).json({ message: "Cannot delete occupied chair." });
    }
    await prisma.chair.delete({ where: { id: chair.id } });
    await cacheChairs(salon.id, await prisma.chair.findMany({ where: { salonId: salon.id } }));
    return res.json({ message: "Chair deleted." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
