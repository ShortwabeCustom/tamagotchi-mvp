export function disposeResources(resources: Record<string, { dispose(): void }>) {
  // Aliases may share a resource; each owned GPU resource is disposed exactly once.
  new Set(Object.values(resources)).forEach(resource => resource.dispose());
}
