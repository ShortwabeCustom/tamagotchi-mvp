import { NextRequest } from "next/server";
import { issueVisitorCookie } from "@/lib/identity/signed-visitor";
import { resolveVisitor } from "@/lib/identity/resolve-visitor";
import { isSameOrigin, privateJson, secureVisitorCookie } from "@/lib/identity/http";
import { VISITOR_COOKIE_NAME, VISITOR_COOKIE_MAX_AGE } from "@/lib/identity/visitor";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return privateJson({ code: "ORIGIN_REJECTED", error: "Solicitud no permitida." }, 403);
  try {
    const current = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    if (await resolveVisitor(current)) return privateJson({ prepared: true });
    const response = privateJson({ prepared: true });
    response.cookies.set({ name: VISITOR_COOKIE_NAME, value: issueVisitorCookie(), httpOnly: true, sameSite: "lax", path: "/", maxAge: VISITOR_COOKIE_MAX_AGE, secure: secureVisitorCookie(request), priority: "high" });
    return response;
  } catch {
    return privateJson({ code: "IDENTITY_UNAVAILABLE", error: "No pude preparar este encuentro. Inténtalo otra vez." }, 503);
  }
}
