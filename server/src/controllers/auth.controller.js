import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateInviteToken, generateJwt } from "../utils/generateToken.js";
import { sendBarberInviteEmail } from "../services/mail.service.js";

const buildAuthPayload = async (user) => {
  let salonId = null;
  if (user.role === Role.barber) {
    const salon = await prisma.salon.findUnique({ where: { ownerId: user.id } });
    salonId = salon?.id || null;
  }
  const token = generateJwt({ userId: user.id, role: user.role, salonId });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, salonId } };
};

export const register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;
    if (role && role !== "customer") {
      return res.status(400).json({ message: "Only customer self-register is allowed." });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) return res.status(400).json({ message: "Email or phone already in use." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, phone, email, passwordHash, role: Role.customer },
    });
    const payload = await buildAuthPayload(user);
    return res.status(201).json(payload);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

    const payload = await buildAuthPayload(user);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const barberRegister = async (req, res) => {
  try {
    const { token } = req.params;
    const { name, phone, email, password, salonName, address, lat, lng, avgServiceTime } = req.body;

    const invite = await prisma.barberInvite.findUnique({ where: { token } });
    if (!invite || invite.usedAt) {
      return res.status(400).json({ message: "Invalid or already used invite token." });
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ message: "Email does not match invite." });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) return res.status(400).json({ message: "Email or phone already in use." });

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: { name, phone, email, passwordHash, role: Role.barber },
      }),
    ]);

    const salon = await prisma.salon.create({
      data: {
        name: salonName || invite.salonName,
        address,
        latitude: Number(lat),
        longitude: Number(lng),
        avgServiceTime: Number(avgServiceTime || 20),
        ownerId: user.id,
      },
    });

    await prisma.barberInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    const authPayload = {
      token: generateJwt({ userId: user.id, role: user.role, salonId: salon.id }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, salonId: salon.id },
    };
    return res.status(201).json(authPayload);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const sendInvite = async (req, res) => {
  try {
    const headerSecret = req.headers["x-admin-secret"];
    if (headerSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid admin secret." });
    }

    const { email, salonName } = req.body;
    const token = generateInviteToken();
    await prisma.barberInvite.create({
      data: { email, salonName, token },
    });
    await sendBarberInviteEmail({ email, token });

    return res.json({ message: "Invite sent.", token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
