import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createVisitorToken, hashVisitorToken } from "@/lib/identity/visitor";
import { recallDisplayName, rememberName } from "@/lib/memory/profile-service";

describe.runIf(process.env.RUN_DB_TESTS === "1")("persistent memory", () => {
  const token = createVisitorToken();
  const visitorHash = hashVisitorToken(token);

  afterAll(async () => {
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
