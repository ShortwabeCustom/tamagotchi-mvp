import type { ApiErrorResponse, ProfileResponse } from "@/types/profile";

export async function rememberDisplayName(displayName: string): Promise<ProfileResponse> {
  const response = await fetch("/api/profile/name", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? "No pude guardar tu nombre. Inténtalo otra vez.");
  }

  return (await response.json()) as ProfileResponse;
}
