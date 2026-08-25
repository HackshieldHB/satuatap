const listeners = new Set<() => void>();
let degraded = false;

export function isLocalMode(): boolean {
  return degraded;
}

export function setLocalMode(value: boolean) {
  if (degraded === value) return;
  degraded = value;
  for (const fn of listeners) fn();
}

export function subscribeLocalMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
