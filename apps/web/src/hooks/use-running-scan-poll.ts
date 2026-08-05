import { useEffect, useRef } from 'react';

/** Poll interval while a domain scan is RUNNING (single in-flight request). */
export const DOMAIN_SCAN_POLL_MS = 5000;

/**
 * Polls only while `isRunning` is true. Skips overlapping requests and runs
 * `onFinished` once when the scan stops (completed, failed, or cancelled).
 */
export function useRunningScanPoll(
  isRunning: boolean,
  poll: () => Promise<void>,
  onFinished?: () => Promise<void>,
) {
  const pollRef = useRef(poll);
  const finishedRef = useRef(onFinished);
  pollRef.current = poll;
  finishedRef.current = onFinished;

  const inFlightRef = useRef(false);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      if (wasRunningRef.current) {
        wasRunningRef.current = false;
        void finishedRef.current?.();
      }
      return;
    }

    wasRunningRef.current = true;

    const id = window.setInterval(() => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      pollRef.current().finally(() => {
        inFlightRef.current = false;
      });
    }, DOMAIN_SCAN_POLL_MS);

    return () => window.clearInterval(id);
  }, [isRunning]);
}
