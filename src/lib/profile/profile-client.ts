import type { ApiErrorResponse, ProfileResponse } from "@/types/profile";

export const NAME_REQUEST_TIMEOUT_MS = 8_000;
export const RECOVERABLE_NAME_ERROR =
  "Espera… creo que no alcancé a guardarlo. ¿Intentamos otra vez?";

interface RememberDisplayNameOptions {
  timeoutMs?: number;
}

export async function rememberDisplayName(
  displayName: string,
  { timeoutMs = NAME_REQUEST_TIMEOUT_MS }: RememberDisplayNameOptions = {},
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
    const response = await Promise.race([
      fetch("/api/profile/name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
      throw new Error(body?.error ?? "name persistence request failed");
    }

    return (await response.json()) as ProfileResponse;
  } catch (error) {
    throw new Error(RECOVERABLE_NAME_ERROR, { cause: error });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
