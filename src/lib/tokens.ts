import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(raw: string, hash: string): boolean {
  const candidate = hashToken(raw);
  const a = Buffer.from(candidate);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
