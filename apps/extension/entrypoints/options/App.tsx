import { useEffect, useState } from 'react';
import {
  clearApiKey,
  isValidApiKeyFormat,
  loadApiKey,
  parseApiKeyEnvironment,
  saveApiKey,
} from '@/lib/storage';
import type { ApiKeyEnvironment } from '@/lib/types';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; env: ApiKeyEnvironment }
  | { kind: 'error'; message: string };

export function App() {
  const [input, setInput] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    void loadApiKey().then(setExisting);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await saveApiKey(input.trim());
      const env = parseApiKeyEnvironment(input.trim());
      setExisting(input.trim());
      setInput('');
      setStatus({ kind: 'saved', env: env ?? 'test' });
      try {
        await chrome.runtime.sendMessage({
          type: 'API_KEY_SAVED',
          environment: env ?? 'test',
        });
      } catch {
        // Best-effort notification. SW may be inactive; the key is already
        // saved in chrome.storage.local, so popup will pick it up on its
        // next open regardless.
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleClear() {
    await clearApiKey();
    setExisting(null);
    setStatus({ kind: 'idle' });
    await chrome.runtime.sendMessage({ type: 'API_KEY_CLEARED' });
  }

  const isInputValid = input.length === 0 || isValidApiKeyFormat(input.trim());
  const env = existing ? parseApiKeyEnvironment(existing) : null;
  const maskedExisting = existing
    ? `${existing.slice(0, 12)}…${existing.slice(-4)}`
    : null;

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>SEO Analyst — Settings</h1>
      <p style={styles.muted}>
        Paste your API key from the SEO Analyst web app to enable on-page
        audits. Keys live only on this device — they never leave Chrome
        unless you call the API.
      </p>

      {maskedExisting ? (
        <section style={styles.card}>
          <p style={styles.row}>
            <strong>Saved key</strong>
            <span style={styles.kbd}>{maskedExisting}</span>
            <span style={env === 'live' ? styles.tagLive : styles.tagTest}>
              {env ?? '?'}
            </span>
          </p>
          <button type="button" style={styles.btnDanger} onClick={handleClear}>
            Forget this key
          </button>
        </section>
      ) : (
        <p style={styles.warn}>
          No key saved yet. Get one at <code>/settings/api-keys</code> on the
          web app.
        </p>
      )}

      <form onSubmit={handleSave} style={styles.form}>
        <label htmlFor="apiKey" style={styles.label}>
          {existing ? 'Replace key' : 'Add key'}
        </label>
        <input
          id="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk_live_… or sk_test_…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            ...styles.input,
            borderColor: isInputValid ? '#cbd5e1' : '#dc2626',
          }}
        />
        {!isInputValid && (
          <p style={styles.errorText}>
            Expected <code>sk_live_</code> or <code>sk_test_</code> followed
            by 43 alphanumeric characters.
          </p>
        )}
        <button
          type="submit"
          disabled={!input || !isInputValid || status.kind === 'saving'}
          style={styles.btnPrimary}
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </form>

      {status.kind === 'saved' && (
        <p style={styles.success}>
          Key saved ({status.env} environment). You can close this tab.
        </p>
      )}
      {status.kind === 'error' && (
        <p style={styles.errorText}>{status.message}</p>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 560,
    margin: '40px auto',
    padding: '0 24px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    color: '#0f172a',
  },
  h1: { fontSize: 24, marginBottom: 8 },
  muted: { color: '#475569', fontSize: 14, lineHeight: 1.5 },
  warn: {
    background: '#fef9c3',
    border: '1px solid #facc15',
    padding: 12,
    borderRadius: 6,
    color: '#854d0e',
    fontSize: 14,
  },
  card: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  row: { display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  kbd: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: '#fff',
    border: '1px solid #cbd5e1',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 13,
  },
  tagLive: {
    background: '#dcfce7',
    color: '#15803d',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  tagTest: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  form: { marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600 },
  input: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  errorText: { color: '#dc2626', fontSize: 13, margin: 0 },
  success: { color: '#15803d', fontSize: 14, marginTop: 12 },
  btnPrimary: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnDanger: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 12,
  },
};
