import { NextRequest } from "next/server";
import { resolveVisitor } from "@/lib/identity/resolve-visitor";
import { isSameOrigin, privateJson } from "@/lib/identity/http";
import { VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return privateJson({ code: "ORIGIN_REJECTED", error: "Solicitud no permitida." }, 403);
  try {
    if (!await resolveVisitor(request.cookies.get(VISITOR_COOKIE_NAME)?.value)) return privateJson({ code: "IDENTITY_REQUIRED", error: "Necesito verificar la cookie de este encuentro antes de guardar." }, 409);
    return privateJson({ verified: true });
  } catch {
    return privateJson({ code: "IDENTITY_UNAVAILABLE", error: "No pude verificar este encuentro. Inténtalo otra vez." }, 503);
  }
}
