import { prisma } from "@/lib/db/prisma";
import { hashVisitorToken, isValidVisitorToken } from "./visitor";
import { verifySignedVisitor } from "./signed-visitor";

// New identities prove issuance by HMAC. Legacy bearer tokens are accepted only
// if their hash already owns a persisted profile; syntax alone grants no write.
export async function resolveVisitor(value: string | undefined): Promise<string | undefined> {
  if (!value) return;
  if (value.startsWith("v1.")) return verifySignedVisitor(value);
  if (!isValidVisitorToken(value)) return;
  const existing = await prisma.userProfile.findUnique({ where: { visitorHash: hashVisitorToken(value) }, select: { id: true } });
  return existing ? value : undefined;
}
