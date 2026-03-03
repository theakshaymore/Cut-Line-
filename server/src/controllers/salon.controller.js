import { ChairStatus, QueueStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { calcWaitTime } from "../utils/calcWaitTime.js";

const toRad = (deg) => (deg * Math.PI) / 180;
const distanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const listSalons = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 5);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng are required query params." });
    }

    const salons = await prisma.salon.findMany({
      include: {
        chairs: true,
        queueEntries: {
          where: { status: QueueStatus.waiting },
        },
      },
    });

    const nearby = salons
      .map((salon) => {
        const dist = distanceKm(lat, lng, salon.latitude, salon.longitude);
        const activeChairs = salon.chairs.filter((c) => c.status === ChairStatus.occupied).length;
        const queueCount = salon.queueEntries.length;
        const estimatedWait = calcWaitTime({
          waitingCount: queueCount,
          activeChairs,
          avgTime: salon.avgServiceTime,
        });
        const availableChairs = salon.chairs.filter((c) => c.status === ChairStatus.idle).length;

        return {
          id: salon.id,
          name: salon.name,
          address: salon.address,
          latitude: salon.latitude,
          longitude: salon.longitude,
          distance: Number(dist.toFixed(2)),
          queueCount,
          estimatedWait,
          availableChairs,
          rating: 4.6,
        };
      })
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return res.json(nearby);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getSalonById = async (req, res) => {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: req.params.id },
      include: {
        chairs: true,
        queueEntries: {
          where: { status: { in: [QueueStatus.waiting, QueueStatus.seated] } },
          orderBy: { position: "asc" },
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!salon) return res.status(404).json({ message: "Salon not found." });

    const activeQueueLength = salon.queueEntries.filter((q) => q.status === QueueStatus.waiting).length;
    return res.json({ ...salon, activeQueueLength });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
