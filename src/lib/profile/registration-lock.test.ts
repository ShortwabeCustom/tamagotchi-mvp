import { afterEach, expect, it, vi } from "vitest";
import { withRegistrationLock, REGISTRATION_BUSY, REGISTRATION_UNSUPPORTED } from "./registration-lock";
import { createRegistrationSession } from "./registration-session";
afterEach(() => vi.unstubAllGlobals());
it("stops a competing context before it starts any identity operation", async () => {
  let held = false;
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, options: { ifAvailable: boolean }, callback: (lock: object | null) => Promise<unknown>) => {
    expect(options.ifAvailable).toBe(true);
    if (held) return callback(null);
    held = true; try { return await callback({}); } finally { held = false; }
  } } });
  let release!: () => void;
  const first = withRegistrationLock(() => new Promise<void>(resolve => { release = resolve; }));
  const competing = vi.fn();
  await expect(withRegistrationLock(competing)).rejects.toThrow(REGISTRATION_BUSY);
  expect(competing).not.toHaveBeenCalled();
  release(); await first;
  await expect(withRegistrationLock(async canPrepare => canPrepare)).resolves.toBe(true);
});
it("without Web Locks refuses a new identity but permits an existing verified one", async () => {
  vi.stubGlobal("navigator", {});
  const noIdentity = vi.fn().mockResolvedValue(Response.json({ code: "IDENTITY_REQUIRED" }, { status: 409 }));
  await expect(createRegistrationSession(noIdentity).submit("Prueba")).rejects.toThrow(REGISTRATION_UNSUPPORTED);
  expect(noIdentity).toHaveBeenCalledTimes(1);
  const existing = vi.fn().mockResolvedValueOnce(Response.json({ verified: true })).mockResolvedValueOnce(Response.json({ displayName: "Prueba", firstMemoryCreated: false }));
  await expect(createRegistrationSession(existing).submit("Prueba")).resolves.toMatchObject({ displayName: "Prueba" });
  expect(existing.mock.calls.map(c => c[0])).toEqual(["/api/identity/verify", "/api/profile/name"]);
});
