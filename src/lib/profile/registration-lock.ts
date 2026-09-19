import { IdentityError } from "./identity-errors";
export const REGISTRATION_BUSY = "Otra pestaña está preparando este encuentro. Espera a que termine e inténtalo de nuevo aquí.";
export const REGISTRATION_UNSUPPORTED = "Este navegador no permite coordinar el primer encuentro de forma segura. Abre esta página en un navegador compatible para guardar tu nombre.";

// An origin-scoped browser lock spans preparation, verification AND persistence.
// No token or personal information crosses tabs; there is no queued auto-submit.
export async function withRegistrationLock<T>(operation: (canPrepare: boolean) => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) return operation(false);
  return navigator.locks.request("bety:visitor-registration:v1", { ifAvailable: true }, async lock => {
    if (!lock) throw new IdentityError(REGISTRATION_BUSY);
    return operation(true);
  });
}
