import { IdentityError, IDENTITY_LOST_ERROR } from "./identity-errors";
import type { ApiErrorResponse, ProfileResponse } from "@/types/profile";

export const NAME_REQUEST_TIMEOUT_MS = 8_000;
export const RECOVERABLE_NAME_ERROR =
  "Espera… creo que no alcancé a guardarlo. ¿Intentamos otra vez?";

interface RememberDisplayNameOptions {
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export async function rememberDisplayName(
  displayName: string,
  { timeoutMs = NAME_REQUEST_TIMEOUT_MS, fetcher = fetch }: RememberDisplayNameOptions = {},
): Promise<ProfileResponse> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("name persistence timed out"));
    }, timeoutMs);
  });

  try {
    const request = async () => {
      const response = await fetcher("/api/profile/name", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        if (body?.code === "IDENTITY_REQUIRED") throw new IdentityError(IDENTITY_LOST_ERROR);
        throw new Error(body?.error ?? "name persistence request failed");
      }
      return (await response.json()) as ProfileResponse;
    };
    // The eight-second deadline includes reading the response body, not just headers.
    return await Promise.race([request(), timeout]);

  } catch (error) {
    if (error instanceof IdentityError) throw error;
    throw new Error(RECOVERABLE_NAME_ERROR, { cause: error });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
