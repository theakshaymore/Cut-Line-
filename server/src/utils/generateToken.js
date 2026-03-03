import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const generateJwt = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const generateInviteToken = () => uuidv4();
