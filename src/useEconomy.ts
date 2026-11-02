import { useCallback, useEffect, useRef, useState } from 'react';
import { EconomyError, fetchEconomy, REFRESH_MS, REQUEST_TIMEOUT_MS, STALE_MS } from './economy';
import type { Economy } from './economy';

export function useEconomy() {
  const [data, setData] = useState<Economy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const active = useRef<AbortController | null>(null);
  const blockedUntil = useRef(0);

  const refresh = useCallback(async () => {
    if (active.current || Date.now() < blockedUntil.current) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const result = await fetchEconomy(controller.signal);
      if (active.current !== controller) return;
      setData(result);
      setCheckedAt(Date.now());
      setNow(Date.now());
      setError(null);
      setRetryAt(0);
      blockedUntil.current = 0;
    } catch (cause) {
      if (active.current !== controller) return;
      const failure = cause instanceof EconomyError ? cause : new EconomyError('Could not read the economy data. Try refreshing.');
      setError(failure.message);
      setRetryAt(failure.retryAt);
      blockedUntil.current = failure.retryAt;
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { const previous = active.current; active.current = null; previous?.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(update, REFRESH_MS);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [autoRefresh, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // API generation time alone can be recent while the indexed block is old.
  const stale = data !== null && (now - Date.parse(data.generatedAt) > STALE_MS || now - Date.parse(data.safeAt) > STALE_MS);
  return { data, loading, error, autoRefresh, setAutoRefresh, checkedAt, stale, refresh, retrySeconds: Math.max(0, Math.ceil((retryAt - now) / 1000)) };
}
