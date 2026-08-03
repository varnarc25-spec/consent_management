type Listener = () => void;

let activeRequests = 0;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeLoading(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLoading(): boolean {
  return activeRequests > 0;
}

export function startLoading(): void {
  activeRequests += 1;
  notify();
}

export function stopLoading(): void {
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
}
