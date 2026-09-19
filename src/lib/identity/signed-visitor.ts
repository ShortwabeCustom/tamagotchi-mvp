import { createHmac, timingSafeEqual } from "node:crypto";
import { createVisitorToken, isValidVisitorToken, VISITOR_COOKIE_MAX_AGE } from "./visitor";

function signingKey(): Buffer {
  const secret = process.env.BETY_IDENTITY_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("Identity signing configuration unavailable");
  return Buffer.from(secret, "hex");
}
function signature(payload: string): string {
  return createHmac("sha256", signingKey()).update(`bety-visitor:${payload}`).digest("base64url");
}
export function issueVisitorCookie(now = Math.floor(Date.now() / 1000)): string {
  const payload = `v1.${createVisitorToken()}.${now}`;
  return `${payload}.${signature(payload)}`;
}
export function verifySignedVisitor(value: string, now = Math.floor(Date.now() / 1000)): string | undefined {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || !isValidVisitorToken(parts[1]) || !/^\d{10}$/.test(parts[2]) || !isValidVisitorToken(parts[3])) return;
  const issued = Number(parts[2]);
  if (issued > now + 60 || now - issued > VISITOR_COOKIE_MAX_AGE) return;
  const expected = Buffer.from(signature(parts.slice(0, 3).join(".")));
  if (!timingSafeEqual(expected, Buffer.from(parts[3]))) return;
  return parts[1];
}
