import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRegistrationSession } from "./registration-session";
import { COOKIE_REQUIRED_ERROR, IDENTITY_LOST_ERROR } from "./identity-errors";
const missing = () => Response.json({ code: "IDENTITY_REQUIRED" }, { status: 409 });
const verified = () => Response.json({ verified: true });
const prepared = () => Response.json({ prepared: true });
const saved = () => Response.json({ displayName: "María José", firstMemoryCreated: false, petAction: { emotion: "happy", animation: "smallBounce", intensity: 0.6 } });
beforeEach(() => vi.stubGlobal("navigator", { locks: { request: (_name: string, _options: unknown, callback: (lock: object) => unknown) => callback({}) } }));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("registration session with explicit transport doubles", () => {
  it("requires cookie echo, shares one operation, and ignores preparation success alone", async () => {
    const fetch = vi.fn().mockImplementationOnce(missing).mockImplementationOnce(prepared).mockImplementationOnce(verified).mockImplementationOnce(saved);
    vi.stubGlobal("fetch", fetch);
    const session = createRegistrationSession(); const stages: string[] = [];
    const first = session.submit("María José", s => stages.push(s));
    expect(session.submit("María José") === first).toBe(true);
    await expect(first).resolves.toMatchObject({ displayName: "María José" });
    expect(stages).toEqual(["preparing", "saving"]);
    expect(fetch.mock.calls.map(c => c[0])).toEqual(["/api/identity/verify", "/api/identity/prepare", "/api/identity/verify", "/api/profile/name"]);
  });
  it("does not write if the browser rejects the preparation cookie", async () => {
    const fetch = vi.fn().mockImplementationOnce(missing).mockImplementationOnce(prepared).mockImplementationOnce(missing);
    vi.stubGlobal("fetch", fetch);
    await expect(createRegistrationSession().submit("María José")).rejects.toThrow(COOKIE_REQUIRED_ERROR);
    expect(fetch.mock.calls.some(c => c[0] === "/api/profile/name")).toBe(false);
  });
  it("retries a lost preparation response without any preceding product write", async () => {
    const fetch = vi.fn().mockImplementationOnce(missing).mockRejectedValueOnce(new Error("transport lost"));
    vi.stubGlobal("fetch", fetch); const session = createRegistrationSession();
    await expect(session.submit("María José")).rejects.toThrow();
    fetch.mockImplementationOnce(missing).mockImplementationOnce(prepared).mockImplementationOnce(verified).mockImplementationOnce(saved);
    await session.submit("María José");
    expect(fetch.mock.calls.filter(c => c[0] === "/api/profile/name")).toHaveLength(1);
  });
  it("reverifies after a lost write response and never prepares a replacement", async () => {
    const fetch = vi.fn().mockImplementationOnce(verified).mockRejectedValueOnce(new Error("response lost after commit"));
    vi.stubGlobal("fetch", fetch); const session = createRegistrationSession();
    await expect(session.submit("María José")).rejects.toThrow();
    fetch.mockImplementationOnce(verified).mockImplementationOnce(saved);
    await session.submit("María José");
    expect(fetch.mock.calls.filter(c => c[0] === "/api/identity/prepare")).toHaveLength(0);
  });
  it("stops if identity disappears after an uncertain write", async () => {
    const fetch = vi.fn().mockImplementationOnce(verified).mockRejectedValueOnce(new Error("response lost"));
    vi.stubGlobal("fetch", fetch); const session = createRegistrationSession();
    await expect(session.submit("María José")).rejects.toThrow();
    fetch.mockImplementationOnce(missing);
    await expect(session.submit("María José")).rejects.toThrow(IDENTITY_LOST_ERROR);
    expect(fetch.mock.calls.filter(c => c[0] === "/api/profile/name")).toHaveLength(1);
    expect(fetch.mock.calls.filter(c => c[0] === "/api/identity/prepare")).toHaveLength(0);
  });
  it("bounds preparation to eight seconds and rejects a late response before writing", async () => {
    vi.useFakeTimers(); let finish!: (r: Response) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch); const session = createRegistrationSession();
    const result = expect(session.submit("María José")).rejects.toThrow("verificar");
    await vi.advanceTimersByTimeAsync(8000); await result;
    finish(verified()); await Promise.resolve(); await Promise.resolve();
    expect(fetch.mock.calls.some(c => c[0] === "/api/profile/name")).toBe(false);
  });
});
it("does not bootstrap again if the name endpoint loses identity after verification", async () => {
  const fetch = vi.fn().mockImplementationOnce(verified).mockImplementationOnce(missing).mockImplementationOnce(missing);
  vi.stubGlobal("fetch", fetch);
  const session = createRegistrationSession();
  await expect(session.submit("María José")).rejects.toThrow(IDENTITY_LOST_ERROR);
  await expect(session.submit("María José")).rejects.toThrow(IDENTITY_LOST_ERROR);
  expect(fetch.mock.calls.filter(c => c[0] === "/api/profile/name")).toHaveLength(1);
  expect(fetch.mock.calls.filter(c => c[0] === "/api/identity/prepare")).toHaveLength(0);
});
