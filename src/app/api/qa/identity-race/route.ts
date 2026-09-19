import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { NextRequest } from "next/server";
import { POST as prepare } from "@/app/api/identity/prepare/route";
import { prisma } from "@/lib/db/prisma";
import { resolveVisitor } from "@/lib/identity/resolve-visitor";
import { hashVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
import { isSameOrigin, privateJson, secureVisitorCookie } from "@/lib/identity/http";
import { verifySignedVisitor } from "@/lib/identity/signed-visitor";

// Opt-in development harness. Only holds test responses; never coordinates production identity.
const shared = globalThis as unknown as { identityRace?: { owned: Set<string>; release?: () => void; pending: boolean; preparations: number } };
const manifest = join(homedir(), ".local/state/bety-sprint2b/identity-race-owned.json");
function state() {
  if (!shared.identityRace) {
    const saved = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : null;
    if (saved && saved.marker !== process.env.BETY_TEST_DB_MARKER) throw new Error("Wrong cleanup manifest owner");
    shared.identityRace = { owned: new Set(saved?.hashes ?? []), pending: false, preparations: saved?.preparations ?? 0 };
  }
  return shared.identityRace;
}
function persist() {
  const run = state();
  writeFileSync(manifest, JSON.stringify({ marker: process.env.BETY_TEST_DB_MARKER, hashes: [...run.owned], preparations: run.preparations }), { mode: 0o600 });
}
async function testDatabase() {
  const target = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (target.hostname !== "127.0.0.1" || target.pathname !== "/bety_integration_test" || !process.env.BETY_TEST_DB_MARKER?.startsWith("bety-sprint2b:")) throw new Error("Test database required");
  const [row] = await prisma.$queryRaw<{ db: string; role: string; marker: string }[]>`SELECT current_database() AS db, current_user AS role, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  if (row.db !== "bety_integration_test" || row.role !== process.env.BETY_TEST_DB_ROLE || row.marker !== process.env.BETY_TEST_DB_MARKER) throw new Error("Test ownership mismatch");
}
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development" || process.env.BETY_IDENTITY_RACE_TEST !== "1" || !["localhost", "127.0.0.1"].includes(request.nextUrl.hostname)) return privateJson({}, 404);
  if (!isSameOrigin(request)) return privateJson({}, 403);
  try {
    await testDatabase(); const run = state();
    const action = request.nextUrl.searchParams.get("action");
    if (action === "prepare") {
      const response = await prepare(request);
      const issued = response.cookies.get(VISITOR_COOKIE_NAME)?.value;
      if (issued) {
        const token = verifySignedVisitor(issued);
        if (!token) throw new Error("Expected signed test cookie");
        run.owned.add(hashVisitorToken(token)); run.preparations++; persist();
      }
      if (request.nextUrl.searchParams.get("hold") === "1") {
        if (run.pending) return privateJson({ error: "Only one held response per test run" }, 409);
        run.pending = true;
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, 120000);
          run.release = () => { clearTimeout(timer); resolve(); };
        });
        run.pending = false; run.release = undefined;
      }
      return response;
    }
    if (action === "release") { run.release?.(); return privateJson({ released: true }); }
    const raw = await resolveVisitor(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
    const currentHash = raw ? hashVisitorToken(raw) : undefined;
    if (action === "reset") {
      if (run.pending) return privateJson({ error: "Release pending response first" }, 409);
      if (currentHash && !run.owned.has(currentHash)) return privateJson({ error: "Refusing to clear identity not issued by this harness" }, 409);
      const deleted = await prisma.userProfile.deleteMany({ where: { visitorHash: { in: [...run.owned] } } });
      run.owned.clear(); run.preparations = 0; persist();
      const response = privateJson({ deletedOwnedProfiles: deleted.count });
      response.cookies.set({ name: VISITOR_COOKIE_NAME, value: "", maxAge: 0, httpOnly: true, sameSite: "lax", path: "/", secure: secureVisitorCookie(request) });
      return response;
    }
    persist();
    const profiles = await prisma.userProfile.findMany({ where: { visitorHash: { in: [...run.owned] } }, select: { id: true, displayName: true } });
    const active = currentHash ? await prisma.userProfile.findUnique({ where: { visitorHash: currentHash }, select: { id: true } }) : null;
    return privateJson({ identityVerified: Boolean(raw), activeProfileId: active?.id ?? null, profiles, pending: run.pending, preparations: run.preparations });
  } catch { return privateJson({ error: "Local test harness unavailable" }, 503); }
}
