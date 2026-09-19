import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as prepare } from "@/app/api/identity/prepare/route";
import { POST as verify } from "@/app/api/identity/verify/route";
import { POST as save } from "@/app/api/profile/name/route";
import { prisma } from "@/lib/db/prisma";
import { createVisitorToken, hashVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
import { verifySignedVisitor } from "@/lib/identity/signed-visitor";
import { recallDisplayName, rememberName } from "@/lib/memory/profile-service";

// Real Route Handlers and PostgreSQL. Cookie transport/loss is controlled by this
// test client, never by application mocks. No cookie/token is printed/asserted raw.
describe.runIf(process.env.RUN_DB_TESTS === "1")("onboarding with real local PostgreSQL", () => {
  const hashes = new Set<string>(); let verifiedDb = false;
  const request = (path: string, cookie?: string, name = "María José", origin = "http://127.0.0.1:3000") => new NextRequest(`http://127.0.0.1:3000${path}`, {
    method: "POST", headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json", ...(cookie ? { cookie: `${VISITOR_COOKIE_NAME}=${cookie}` } : {}) }, body: JSON.stringify({ displayName: name }),
  });
  const token = (cookie: string) => verifySignedVisitor(cookie) ?? cookie;
  const rememberOwned = (cookie: string) => { hashes.add(hashVisitorToken(token(cookie))); return cookie; };
  async function identity() {
    const response = await prepare(request("/api/identity/prepare"));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get(VISITOR_COOKIE_NAME)?.value;
    if (!cookie) throw new Error("Preparation cookie missing");
    return rememberOwned(cookie);
  }
  async function counts(cookie: string) {
    const visitorHash = hashVisitorToken(token(cookie));
    const profiles = await prisma.userProfile.findMany({ where: { visitorHash }, select: { id: true } });
    return { ids: profiles.map(p => p.id), profiles: profiles.length,
      memories: await prisma.memory.count({ where: { user: { visitorHash }, category: "identity", key: "displayName" } }),
      pets: await prisma.petState.count({ where: { user: { visitorHash } } }) };
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "invalid:");
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/bety_integration_test" || !process.env.BETY_TEST_DB_MARKER?.startsWith("bety-sprint2b:")) throw new Error("Exclusive local test database required");
    const rows = await prisma.$queryRaw<{ db: string; role: string; marker: string }[]>`SELECT current_database() AS db, current_user AS role, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
    if (rows[0]?.db !== "bety_integration_test" || rows[0]?.role !== process.env.BETY_TEST_DB_ROLE || rows[0]?.marker !== process.env.BETY_TEST_DB_MARKER) throw new Error("Database ownership mismatch");
    verifiedDb = true;
  });
  afterAll(async () => {
    if (verifiedDb) await prisma.userProfile.deleteMany({ where: { visitorHash: { in: [...hashes] } } });
    await prisma.$disconnect();
  });
  it("prepares without product writes, verifies echo and preserves prepared identity", async () => {
    const cookie = await identity();
    expect(await counts(cookie)).toMatchObject({ profiles: 0, memories: 0, pets: 0 });
    const echoed = await verify(request("/api/identity/verify", cookie));
    expect(echoed.status).toBe(200);
    expect(echoed.headers.get("cache-control")).toBe("private, no-store");
    const reused = await prepare(request("/api/identity/prepare", cookie));
    expect(reused.headers.get("set-cookie") === null).toBe(true);
    expect(await counts(cookie)).toMatchObject({ profiles: 0, memories: 0, pets: 0 });
  });
  it("loses preparation response, recovers, and never creates a profile before verified write", async () => {
    const lostCookie = await identity(); // Received by test transport; never delivered to client cookie jar.
    const recovered = await identity();
    expect(await counts(lostCookie)).toMatchObject({ profiles: 0, memories: 0, pets: 0 });
    expect(await counts(recovered)).toMatchObject({ profiles: 0, memories: 0, pets: 0 });
    expect((await verify(request("/api/identity/verify", recovered))).status).toBe(200);
  });
  it("rejects absent/rejected cookies and arbitrary correctly shaped tokens with zero writes", async () => {
    const rejected = await identity();
    const arbitrary = rememberOwned(createVisitorToken());
    const before = await prisma.userProfile.count();
    for (const cookie of [undefined, arbitrary, "invalid"]) {
      const response = await save(request("/api/profile/name", cookie));
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe("IDENTITY_REQUIRED");
      expect(response.headers.get("set-cookie") === null).toBe(true);
    }
    expect(await prisma.userProfile.count()).toBe(before);
    expect(await counts(rejected)).toMatchObject({ profiles: 0, memories: 0, pets: 0 });
  });
  it("verifies SQL commit before dropping save response; retry and recall use the same UUID", async () => {
    const cookie = await identity();
    expect((await verify(request("/api/identity/verify", cookie))).status).toBe(200);
    const first = await save(request("/api/profile/name", cookie, "  María   José  "));
    expect(first.status).toBe(200);
    const committed = await counts(cookie); // Independent SQL reads BEFORE simulated response loss.
    expect(committed).toMatchObject({ profiles: 1, memories: 1, pets: 1 });
    // Drop response body now; cookie was already stored/echoed before this POST.
    const retry = await save(request("/api/profile/name", cookie, "María José"));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ displayName: "María José", firstMemoryCreated: false });
    expect(await counts(cookie)).toEqual(committed);
    expect(await recallDisplayName(token(cookie))).toBe("María José");
    console.info(JSON.stringify({ scenario: "commit-then-drop-response", lossPoint: "After handler transaction resolved and independent SQL counts, before client consumes response", firstProfileId: committed.ids[0], recoveredProfileId: (await counts(cookie)).ids[0], ...committed }));
  });
  it("serializes eight concurrent first writes into one profile, memory and pet", async () => {
    const cookie = await identity();
    const results = await Promise.all(Array.from({ length: 8 }, () => save(request("/api/profile/name", cookie))));
    expect(results.map(r => r.status)).toEqual(Array(8).fill(200));
    const bodies = await Promise.all(results.map(r => r.json()));
    expect(bodies.filter(r => r.firstMemoryCreated)).toHaveLength(1);
    expect(await counts(cookie)).toMatchObject({ profiles: 1, memories: 1, pets: 1 });
    const pet = await prisma.petState.findFirstOrThrow({ where: { user: { visitorHash: hashVisitorToken(token(cookie)) } } });
    expect(pet.relationshipLevel).toBe(0);
    console.info(JSON.stringify({ scenario: "8-concurrent-first-writes", ...await counts(cookie), firstMemoryEvents: 1, relationshipLevel: pet.relationshipLevel }));
  });
  it("keeps a valid legacy cookie and updates a different name on the same profile", async () => {
    const legacy = rememberOwned(createVisitorToken());
    await rememberName(legacy, "Nombre Anterior");
    const original = await counts(legacy);
    expect((await prepare(request("/api/identity/prepare", legacy))).headers.get("set-cookie") === null).toBe(true);
    expect((await verify(request("/api/identity/verify", legacy))).status).toBe(200);
    expect((await save(request("/api/profile/name", legacy, "Nombre Nuevo"))).status).toBe(200);
    expect(await counts(legacy)).toEqual(original);
    expect(await recallDisplayName(legacy)).toBe("Nombre Nuevo");
  });
  it("does not merge equal names belonging to distinct identities", async () => {
    const a = await identity(), b = await identity();
    await save(request("/api/profile/name", a)); await save(request("/api/profile/name", b));
    const first = await counts(a), second = await counts(b);
    expect(first.ids[0] !== second.ids[0]).toBe(true);
    expect(first).toMatchObject({ profiles: 1, memories: 1, pets: 1 });
    expect(second).toMatchObject({ profiles: 1, memories: 1, pets: 1 });
  });
  it("rejects forged signatures and foreign origin without accessing another profile", async () => {
    const cookie = await identity(); await save(request("/api/profile/name", cookie));
    const before = await counts(cookie);
    const parts = cookie.split("."); parts[3] = "A".repeat(43);
    expect((await save(request("/api/profile/name", parts.join("."), "Intruso"))).status).toBe(409);
    expect((await prepare(request("/api/identity/prepare", cookie, "Intruso", "https://other.example"))).status).toBe(403);
    expect(await counts(cookie)).toEqual(before);
    expect(await recallDisplayName(token(cookie))).toBe("María José");
  });
  it("fails closed without signing configuration and does not write or issue a cookie", async () => {
    const secret = process.env.BETY_IDENTITY_SECRET;
    const before = await prisma.userProfile.count();
    try {
      delete process.env.BETY_IDENTITY_SECRET;
      const response = await prepare(request("/api/identity/prepare"));
      expect(response.status).toBe(503);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await prisma.userProfile.count()).toBe(before);
    } finally {
      if (secret === undefined) delete process.env.BETY_IDENTITY_SECRET;
      else process.env.BETY_IDENTITY_SECRET = secret;
    }
  });
});
