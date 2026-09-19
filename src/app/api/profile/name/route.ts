import { NextRequest } from "next/server";
import { VISITOR_COOKIE_NAME } from "@/lib/identity/visitor";
import { resolveVisitor } from "@/lib/identity/resolve-visitor";
import { isSameOrigin, privateJson } from "@/lib/identity/http";
import { rememberName } from "@/lib/memory/profile-service";
import { validateDisplayName } from "@/lib/validation/display-name";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 1_024;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return privateJson({ error: "Solicitud no permitida." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return privateJson({ error: "La solicitud es demasiado grande." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "No pude leer ese nombre." }, 400);
  }

  const displayName =
    typeof body === "object" && body !== null && "displayName" in body
      ? (body as { displayName: unknown }).displayName
      : undefined;
  const validation = validateDisplayName(displayName);

  if (!validation.valid) {
    return privateJson({ error: validation.error }, 400);
  }

  try {
    const visitorToken = await resolveVisitor(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
    if (!visitorToken) return privateJson({ code: "IDENTITY_REQUIRED", error: "Necesito verificar la cookie de este encuentro antes de guardar." }, 409);
    return privateJson(await rememberName(visitorToken, validation.value));
  } catch {
    return privateJson({ code: "PERSISTENCE_UNAVAILABLE", error: "No pude confirmar que se guardó. ¿Intentamos de nuevo?" }, 503);
  }
}
