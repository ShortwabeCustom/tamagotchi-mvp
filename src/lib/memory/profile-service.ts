import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashVisitorToken } from "@/lib/identity/visitor";
import type { PetAction } from "@/types/pet";

const HAPPY_NAME_ACTION: PetAction = {
  emotion: "happy",
  animation: "smallBounce",
  intensity: 0.6,
};

export interface RememberNameResult {
  displayName: string;
  firstMemoryCreated: boolean;
  petAction: PetAction;
}

export async function rememberName(
  visitorToken: string,
  displayName: string,
): Promise<RememberNameResult> {
  const visitorHash = hashVisitorToken(visitorToken);
  const now = new Date();

  // Serializable protects the entire three-record transaction, including the
  // first-memory decision. Retry only documented serialization/write conflicts.
  const write = () => prisma.$transaction(async (transaction) => {
    const profile = await transaction.userProfile.upsert({
      where: { visitorHash },
      create: { visitorHash, displayName },
      update: { displayName },
      select: { id: true, displayName: true },
    });

    const existingMemory = await transaction.memory.findUnique({
      where: {
        userId_category_key: {
          userId: profile.id,
          category: "identity",
          key: "displayName",
        },
      },
      select: { id: true },
    });

    await transaction.memory.upsert({
      where: {
        userId_category_key: {
          userId: profile.id,
          category: "identity",
          key: "displayName",
        },
      },
      create: {
        userId: profile.id,
        category: "identity",
        key: "displayName",
        value: displayName,
        confidence: 1,
        importance: 1,
        lastUsedAt: now,
      },
      update: {
        value: displayName,
        confidence: 1,
        importance: 1,
        lastUsedAt: now,
      },
    });

    await transaction.petState.upsert({
      where: { userId: profile.id },
      create: {
        userId: profile.id,
        relationshipLevel: 0,
        lastInteractionAt: now,
      },
      update: { lastInteractionAt: now },
    });

    return {
      displayName: profile.displayName ?? displayName,
      firstMemoryCreated: existingMemory === null,
    };
  }, { isolationLevel: "Serializable" });

  for (let attempt = 0; ; attempt++) {
    try { return { ...await write(), petAction: HAPPY_NAME_ACTION }; }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}

export async function recallDisplayName(visitorToken: string): Promise<string | null> {
  const visitorHash = hashVisitorToken(visitorToken);
  const profile = await prisma.userProfile.findUnique({
    where: { visitorHash },
    select: { id: true, displayName: true },
  });

  if (!profile?.displayName) return null;

  const now = new Date();
  await prisma.$transaction([
    prisma.memory.updateMany({
      where: {
        userId: profile.id,
        category: "identity",
        key: "displayName",
      },
      data: { lastUsedAt: now },
    }),
    prisma.petState.upsert({
      where: { userId: profile.id },
      create: {
        userId: profile.id,
        relationshipLevel: 0,
        lastInteractionAt: now,
      },
      update: { lastInteractionAt: now },
    }),
  ]);

  return profile.displayName;
}
