import { QueueStatus, ChairStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { calcWaitTime } from "../utils/calcWaitTime.js";
import { cacheChairs, cacheQueue, checkJoinRateLimit } from "./redis.service.js";

const waitingInclude = {
  customer: { select: { id: true, name: true, phone: true } },
};

export const hydrateRedisFromPostgres = async () => {
  const salons = await prisma.salon.findMany({
    include: {
      chairs: true,
      queueEntries: {
        where: { status: QueueStatus.waiting },
        orderBy: { position: "asc" },
        include: waitingInclude,
      },
    },
  });

  await Promise.all(
    salons.map(async (salon) => {
      await cacheQueue(salon.id, salon.queueEntries);
      await cacheChairs(salon.id, salon.chairs);
    }),
  );
};

export const getSalonQueueSnapshot = async (salonId) => {
  const queue = await prisma.queueEntry.findMany({
    where: { salonId, status: QueueStatus.waiting },
    orderBy: { position: "asc" },
    include: waitingInclude,
  });
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  const activeChairs = await prisma.chair.count({
    where: { salonId, status: ChairStatus.occupied },
  });
  const totalWait = calcWaitTime({
    waitingCount: queue.length,
    activeChairs,
    avgTime: salon?.avgServiceTime || 20,
  });

  return { queue, totalWait };
};

export const recalcWaitingPositions = async (salonId, io) => {
  const waitingEntries = await prisma.queueEntry.findMany({
    where: { salonId, status: QueueStatus.waiting },
    orderBy: { joinedAt: "asc" },
  });
  const activeChairs = await prisma.chair.count({
    where: { salonId, status: ChairStatus.occupied },
  });
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });

  const updates = waitingEntries.map((entry, idx) => {
    const position = idx + 1;
    const estimatedWait = calcWaitTime({
      waitingCount: position,
      activeChairs,
      avgTime: salon?.avgServiceTime || 20,
    });
    return prisma.queueEntry.update({
      where: { id: entry.id },
      data: { position, estimatedWait },
    });
  });

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  const updatedQueue = await prisma.queueEntry.findMany({
    where: { salonId, status: QueueStatus.waiting },
    orderBy: { position: "asc" },
    include: waitingInclude,
  });

  await cacheQueue(salonId, updatedQueue);

  updatedQueue.forEach((entry) => {
    io.to(`customer:${entry.customerId}`).emit("position-changed", {
      newPosition: entry.position,
      estimatedWait: entry.estimatedWait,
    });
  });

  io.to(`salon:${salonId}`).emit("queue-updated", {
    queue: updatedQueue,
    totalWait: updatedQueue[updatedQueue.length - 1]?.estimatedWait || 0,
  });
};

export const joinQueue = async ({ customerId, salonId, service, io }) => {
  const rateLimited = await checkJoinRateLimit(customerId);
  if (rateLimited) {
    throw new Error("Too many attempts. Try again in a few seconds.");
  }

  const existing = await prisma.queueEntry.findFirst({
    where: {
      customerId,
      status: { in: [QueueStatus.waiting, QueueStatus.called, QueueStatus.seated] },
    },
  });
  if (existing) throw new Error("You already have an active queue entry.");

  const [salon, activeChairs, maxPosition] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.chair.count({ where: { salonId, status: ChairStatus.occupied } }),
    prisma.queueEntry.aggregate({
      where: { salonId, status: QueueStatus.waiting },
      _max: { position: true },
    }),
  ]);

  if (!salon) throw new Error("Salon not found.");

  const position = (maxPosition._max.position || 0) + 1;
  const estimatedWait = calcWaitTime({
    waitingCount: position,
    activeChairs,
    avgTime: salon.avgServiceTime,
  });

  const entry = await prisma.queueEntry.create({
    data: { customerId, salonId, service, position, estimatedWait },
    include: waitingInclude,
  });

  await recalcWaitingPositions(salonId, io);
  return entry;
};

export const leaveQueue = async ({ customerId, io }) => {
  const entry = await prisma.queueEntry.findFirst({
    where: { customerId, status: QueueStatus.waiting },
  });
  if (!entry) throw new Error("Active waiting queue entry not found.");

  await prisma.queueEntry.delete({ where: { id: entry.id } });
  await recalcWaitingPositions(entry.salonId, io);
};

export const assignNextToChair = async ({ chairId, barberId, io }) => {
  const chair = await prisma.chair.findUnique({ where: { id: chairId }, include: { salon: true } });
  if (!chair) throw new Error("Chair not found.");
  if (chair.salon.ownerId !== barberId) throw new Error("Not allowed for this salon.");

  const nextEntry = await prisma.queueEntry.findFirst({
    where: { salonId: chair.salonId, status: QueueStatus.waiting },
    orderBy: { position: "asc" },
    include: { customer: true },
  });
  if (!nextEntry) throw new Error("Queue is empty.");

  const [updatedEntry, updatedChair] = await prisma.$transaction([
    prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: QueueStatus.seated,
        assignedChairId: chairId,
        calledAt: new Date(),
      },
      include: { customer: true },
    }),
    prisma.chair.update({
      where: { id: chairId },
      data: { status: ChairStatus.occupied, currentQueueEntryId: nextEntry.id },
    }),
  ]);

  io.to(`customer:${nextEntry.customerId}`).emit("your-turn", {
    message: "It is your turn now.",
    chairLabel: chair.label,
    salonName: chair.salon.name,
  });
  io.to(`barber:${barberId}`).emit("service-timer-started", {
    chairId: chair.id,
    suggestedDoneAt: new Date(Date.now() + chair.salon.avgServiceTime * 60 * 1000),
  });
  io.to(`salon:${chair.salonId}`).emit("chair-updated", {
    chairId: chair.id,
    status: updatedChair.status,
    currentCustomer: {
      id: updatedEntry.customerId,
      name: updatedEntry.customer.name,
      service: updatedEntry.service,
    },
  });

  await recalcWaitingPositions(chair.salonId, io);
  await cacheChairs(
    chair.salonId,
    await prisma.chair.findMany({ where: { salonId: chair.salonId } }),
  );
  return { chair: updatedChair, entry: updatedEntry };
};

export const markChairDone = async ({ chairId, barberId, io }) => {
  const chair = await prisma.chair.findUnique({
    where: { id: chairId },
    include: { salon: true, currentEntry: true },
  });
  if (!chair) throw new Error("Chair not found.");
  if (chair.salon.ownerId !== barberId) throw new Error("Not allowed.");
  if (!chair.currentEntry) throw new Error("No active customer on chair.");

  await prisma.$transaction([
    prisma.queueEntry.update({
      where: { id: chair.currentEntry.id },
      data: { status: QueueStatus.done, servedAt: new Date() },
    }),
    prisma.chair.update({
      where: { id: chairId },
      data: { status: ChairStatus.done, currentQueueEntryId: null },
    }),
  ]);

  io.to(`salon:${chair.salonId}`).emit("chair-updated", {
    chairId: chair.id,
    status: ChairStatus.done,
    currentCustomer: null,
  });
  await recalcWaitingPositions(chair.salonId, io);
};

export const setChairIdle = async ({ chairId, barberId, io }) => {
  const chair = await prisma.chair.findUnique({ where: { id: chairId }, include: { salon: true } });
  if (!chair) throw new Error("Chair not found.");
  if (chair.salon.ownerId !== barberId) throw new Error("Not allowed.");

  const updated = await prisma.chair.update({
    where: { id: chairId },
    data: { status: ChairStatus.idle },
  });
  io.to(`salon:${chair.salonId}`).emit("chair-updated", {
    chairId: chair.id,
    status: updated.status,
    currentCustomer: null,
  });
  await cacheChairs(
    chair.salonId,
    await prisma.chair.findMany({ where: { salonId: chair.salonId } }),
  );
  return updated;
};

export const markNoShow = async ({ entryId, barberId, io }) => {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    include: { salon: true },
  });
  if (!entry) throw new Error("Queue entry not found.");
  if (entry.salon.ownerId !== barberId) throw new Error("Not allowed.");

  await prisma.queueEntry.update({
    where: { id: entryId },
    data: { status: QueueStatus.no_show },
  });

  io.to(`customer:${entry.customerId}`).emit("kicked-from-queue", {
    reason: "Marked as no-show by barber",
  });
  await recalcWaitingPositions(entry.salonId, io);
};
