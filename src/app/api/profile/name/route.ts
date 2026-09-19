import { NextRequest, NextResponse } from "next/server";
import {
  createVisitorToken,
  isValidVisitorToken,
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_NAME,
} from "@/lib/identity/visitor";
import { rememberName } from "@/lib/memory/profile-service";
import { validateDisplayName } from "@/lib/validation/display-name";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 1_024;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No pude leer ese nombre." }, { status: 400 });
  }

  const displayName =
    typeof body === "object" && body !== null && "displayName" in body
      ? (body as { displayName: unknown }).displayName
      : undefined;
  const validation = validateDisplayName(displayName);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const currentToken = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  const visitorToken = isValidVisitorToken(currentToken) ? currentToken : createVisitorToken();

  try {
    const result = await rememberName(visitorToken, validation.value);
    const response = NextResponse.json(result);

    if (visitorToken !== currentToken) {
      response.cookies.set({
        name: VISITOR_COOKIE_NAME,
        value: visitorToken,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
        secure: isHttps(request),
        priority: "high",
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "No pude guardar tu nombre ahora. Inténtalo otra vez." },
      { status: 503 },
    );
  }
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function isHttps(request: NextRequest): boolean {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
}
