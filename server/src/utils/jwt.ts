import jwt from "jsonwebtoken";
import { env } from "../env";

export function signAccessToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "2h" });
}
