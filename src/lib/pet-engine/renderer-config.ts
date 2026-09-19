/** Called by the server on each request; only an allowlisted value reaches the client. */
export function resolvePetRenderer(value: string | undefined): "2d" | "3d" {
  return value === "3d" ? "3d" : "2d";
}
export function resolveRendererTimeout(value: string | undefined): number {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds >= 100 && milliseconds <= 30000 ? milliseconds : 6000;
}
