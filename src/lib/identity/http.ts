import { NextRequest, NextResponse } from "next/server";

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
export function isSameOrigin(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Existing non-browser clients; browser POSTs send Origin.
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}
export function secureVisitorCookie(request: NextRequest): boolean {
  // Explicit exception for this local test runner, never inferred from NODE_ENV.
  const localHttp = process.env.BETY_LOCAL_HTTP === "1" && request.nextUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(request.nextUrl.hostname) && request.headers.get("host") === `127.0.0.1${request.nextUrl.port ? `:${request.nextUrl.port}` : ""}` && request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() !== "https";
  return !localHttp;
}
