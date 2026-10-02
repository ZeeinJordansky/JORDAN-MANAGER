import { useState, useEffect } from 'react';

/**
 * Measures real, live round-trip latency (ping in milliseconds)
 * between the user's browser and the active web server.
 */
export function useRealPing(intervalMs = 4000) {
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const measurePing = async () => {
      try {
        const start = performance.now();
        // Cache-busting query parameter to measure actual network roundtrip
        const res = await fetch(`/api/health?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error('Health check error');
        const end = performance.now();
        const latency = Math.max(1, Math.round(end - start));
        if (isMounted) {
          setPing(latency);
        }
      } catch (err) {
        // Fallback or retry
        if (isMounted && ping === null) {
          setPing(null);
        }
      }
    };

    // Immediate initial measurement
    measurePing();
    const timer = setInterval(measurePing, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return ping;
}
