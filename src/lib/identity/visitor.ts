import { createHash, randomBytes } from "node:crypto";

export const VISITOR_COOKIE_NAME = "bety_visitor";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VISITOR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export function createVisitorToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidVisitorToken(token: string | undefined): token is string {
  return typeof token === "string" && VISITOR_TOKEN_PATTERN.test(token);
}

export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
