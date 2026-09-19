import { rememberDisplayName, RECOVERABLE_NAME_ERROR, NAME_REQUEST_TIMEOUT_MS } from "./profile-client";
import { withRegistrationLock, REGISTRATION_UNSUPPORTED } from "./registration-lock";
import type { ProfileResponse } from "@/types/profile";

import { COOKIE_REQUIRED_ERROR, IDENTITY_LOST_ERROR, IdentityError } from "./identity-errors";

// One coordinator per mounted Experience. No identity value is exposed to JS.
// Preparation is lazy on first submit: no effects/rerenders can issue cookies.
export function createRegistrationSession(transport: typeof fetch = (...args) => fetch(...args)) {
  let writeAttempted = false;
  let inFlight: Promise<ProfileResponse> | undefined;
  let disposed = false;
  let preparationController: AbortController | undefined;
  async function checkIdentity(canPrepare: boolean) {
    const controller = new AbortController();
    preparationController = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new IdentityError("No pude verificar este encuentro ahora. Conservé tu nombre; intenta de nuevo.")); }, NAME_REQUEST_TIMEOUT_MS);
    });
    const exchange = async () => {
      const post = async (path: string) => {
        const response = await transport(path, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (disposed || controller.signal.aborted) throw new Error("Preparation cancelled");
        return { response, body };
      };
      let check = await post("/api/identity/verify");
      if (check.response.ok && check.body.verified === true) return;
      if (check.body.code !== "IDENTITY_REQUIRED") throw new IdentityError("No pude verificar este encuentro ahora. Conservé tu nombre; intenta de nuevo.");
      // Once a write might have reached the server, never silently bootstrap a
      // replacement identity. A retry only verifies the cookie already held.
      if (writeAttempted) throw new IdentityError(IDENTITY_LOST_ERROR);
      if (!canPrepare) throw new IdentityError(REGISTRATION_UNSUPPORTED);
      const prepared = await post("/api/identity/prepare");
      if (!prepared.response.ok) throw new IdentityError("No pude preparar este encuentro ahora. Intenta de nuevo.");
      check = await post("/api/identity/verify");
      if (!check.response.ok || check.body.verified !== true) {
        throw new IdentityError(check.body.code === "IDENTITY_REQUIRED" ? COOKIE_REQUIRED_ERROR : "No pude verificar este encuentro ahora. Intenta de nuevo.");
      }
    };
    try { await Promise.race([exchange(), timeout]); }
    finally { clearTimeout(timer); preparationController = undefined; }
  }
  return {
    submit(name: string, onStage: (stage: "preparing" | "saving") => void = () => {}): Promise<ProfileResponse> {
      if (inFlight) return inFlight;
      const operation = async (canPrepare: boolean) => {
        if (disposed) throw new Error(RECOVERABLE_NAME_ERROR);
        onStage("preparing");
        await checkIdentity(canPrepare);
        if (disposed) throw new Error(RECOVERABLE_NAME_ERROR);
        writeAttempted = true;
        onStage("saving");
        return rememberDisplayName(name, { fetcher: transport });
      };
      inFlight = withRegistrationLock(operation).finally(() => { inFlight = undefined; });
      return inFlight;
    },
    cancel() { disposed = true; preparationController?.abort(); },
  };
}
