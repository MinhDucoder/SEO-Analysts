import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';

/**
 * Phase 1 popup is a placeholder — it surfaces whether a key is saved
 * and gives a one-click path to the options page. Phase 2 will add the
 * keyword input and the audit-trigger button that calls /public/check.
 */
export function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [env, setEnv] = useState<'live' | 'test' | null>(null);

  useEffect(() => {
    void loadApiKey().then((k) => {
      setHasKey(!!k);
      if (k) setEnv(parseApiKeyEnvironment(k));
    });
  }, []);

  function openOptions() {
    void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>SEO Analyst</h1>
      {hasKey === null && <p style={styles.muted}>Loading…</p>}
      {hasKey === false && (
        <>
          <p style={styles.warn}>No API key saved yet.</p>
          <button type="button" style={styles.btn} onClick={openOptions}>
            Set up API key
          </button>
        </>
      )}
      {hasKey === true && (
        <>
          <p style={styles.ok}>
            Key ready ({env ?? '?'}). Audit UI lands in Phase 2.
          </p>
          <button type="button" style={styles.btnSecondary} onClick={openOptions}>
            Manage key
          </button>
        </>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    width: 320,
    padding: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f172a',
  },
  h1: { fontSize: 16, margin: '0 0 8px' },
  muted: { color: '#64748b', fontSize: 13 },
  warn: { color: '#854d0e', fontSize: 13 },
  ok: { color: '#15803d', fontSize: 13 },
  btn: {
    padding: '6px 12px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 12px',
    background: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
};
