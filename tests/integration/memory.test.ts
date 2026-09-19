import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createVisitorToken, hashVisitorToken } from "@/lib/identity/visitor";
import { recallDisplayName, rememberName } from "@/lib/memory/profile-service";

describe.runIf(process.env.RUN_DB_TESTS === "1")("persistent memory", () => {
  const token = createVisitorToken();
  const visitorHash = hashVisitorToken(token);

  let verified = false;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? "invalid:");
    if (target.hostname !== "127.0.0.1" || target.pathname !== "/bety_integration_test") throw new Error("Only the exclusive loopback test database is allowed");
    const expected = process.env.BETY_TEST_DB_MARKER;
    if (!expected?.startsWith("bety-sprint2b:") || !process.env.BETY_TEST_DB_ROLE) throw new Error("Exclusive test database marker required");
    const rows = await prisma.$queryRaw<{ db: string; role: string; marker: string }[]>`SELECT current_database() AS db, current_user AS role, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
    if (rows[0]?.db !== "bety_integration_test" || rows[0]?.marker !== expected || rows[0]?.role !== process.env.BETY_TEST_DB_ROLE) throw new Error("Wrong integration destination");
    verified = true;
  });
  afterAll(async () => {
    if (!verified) { await prisma.$disconnect(); return; }
    await prisma.userProfile.deleteMany({ where: { visitorHash } });
    await prisma.$disconnect();
  });

  it("creates, updates and recalls the canonical display name", async () => {
    const firstWrite = await rememberName(token, "Bety");
    expect(firstWrite).toMatchObject({
      displayName: "Bety",
      firstMemoryCreated: true,
      petAction: { emotion: "happy", animation: "smallBounce", intensity: 0.6 },
    });

    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { visitorHash },
      include: { memories: true, petState: true },
    });
    expect(profile.displayName).toBe("Bety");
    expect(profile.memories).toHaveLength(1);
    expect(profile.memories[0]).toMatchObject({
      category: "identity",
      key: "displayName",
      value: "Bety",
    });
    expect(profile.petState).not.toBeNull();

    const secondWrite = await rememberName(token, "María José");
    expect(secondWrite.firstMemoryCreated).toBe(false);
    expect(await recallDisplayName(token)).toBe("María José");

    const memories = await prisma.memory.count({ where: { userId: profile.id } });
    expect(memories).toBe(1);
  });
});
