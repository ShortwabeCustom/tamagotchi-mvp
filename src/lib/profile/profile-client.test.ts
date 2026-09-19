import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileResponse } from "@/types/profile";
import {
  RECOVERABLE_NAME_ERROR,
  rememberDisplayName,
} from "./profile-client";

const PROFILE_RESPONSE: ProfileResponse = {
  displayName: "Bety",
  firstMemoryCreated: true,
  petAction: { emotion: "happy", animation: "smallBounce", intensity: 0.6 },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rememberDisplayName", () => {
  it("returns the persisted profile after a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(PROFILE_RESPONSE), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(rememberDisplayName("Bety", { timeoutMs: 100 })).resolves.toEqual(
      PROFILE_RESPONSE,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("replaces a server error with the safe recovery message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Prisma connection failed" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(rememberDisplayName("Bety", { timeoutMs: 100 })).rejects.toThrow(
      RECOVERABLE_NAME_ERROR,
    );
  });

  it("replaces a network exception with the safe recovery message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    await expect(rememberDisplayName("Bety", { timeoutMs: 100 })).rejects.toThrow(
      RECOVERABLE_NAME_ERROR,
    );
  });

  it("aborts a stalled request and returns a recoverable timeout", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => undefined);
      }),
    );

    await expect(rememberDisplayName("Bety", { timeoutMs: 5 })).rejects.toThrow(
      RECOVERABLE_NAME_ERROR,
    );
    expect(signal?.aborted).toBe(true);
  });
});

it("includes a stalled JSON body in the request deadline", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => undefined) }));
  await expect(rememberDisplayName("María José", { timeoutMs: 5 })).rejects.toThrow(RECOVERABLE_NAME_ERROR);
});
