import { useEffect, useState } from 'react';
import {
  clearApiKey,
  isValidApiKeyFormat,
  loadApiKey,
  parseApiKeyEnvironment,
  saveApiKey,
} from '@/lib/storage';
import { Button, Input, Badge } from '@/components';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

export function App() {
  const [input, setInput] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    void loadApiKey().then(setExisting);
  }, []);

  const existingEnv = existing ? parseApiKeyEnvironment(existing) : null;
  const inputValid = input.length === 0 || isValidApiKeyFormat(input);
  const inputEnv = isValidApiKeyFormat(input) ? parseApiKeyEnvironment(input) : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await saveApiKey(input.trim());
      const env = parseApiKeyEnvironment(input.trim());
      setExisting(input.trim());
      setInput('');
      try {
        await chrome.runtime.sendMessage({
          type: 'API_KEY_SAVED',
          environment: env ?? 'test',
        });
      } catch {
        // SW may be inactive; key is already in chrome.storage.local.
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
    try {
      await chrome.runtime.sendMessage({ type: 'API_KEY_CLEARED' });
    } catch {
      // SW may be inactive; storage already updated.
    }
  }

  // === Saved state ===
  if (existing) {
    return (
      <main className="opt">
        <header className="opt-header">
          <h1 className="opt-title">SEO Analyst — Settings</h1>
        </header>
        <section className="opt-section">
          <div className="opt-section-header">
            <label className="opt-label">API key</label>
            {existingEnv && <Badge variant="env" tone={existingEnv}>{existingEnv}</Badge>}
          </div>
          <input
            className="field-input"
            type="text"
            value={maskKey(existing)}
            readOnly
            aria-label="Saved API key (masked)"
          />
          <Button variant="secondary" size="md" onClick={handleClear}>
            Remove
          </Button>
        </section>
      </main>
    );
  }

  // === Empty / Typing / Error state ===
  const error = !inputValid ? 'Key must match sk_(live|test)_ followed by 43 chars' : undefined;

  return (
    <main className="opt">
      <header className="opt-header">
        <h1 className="opt-title">SEO Analyst — Settings</h1>
      </header>
      <form className="opt-section" onSubmit={handleSave}>
        <Input
          label="API key"
          placeholder="Paste your sk_(live|test)_..."
          value={input}
          onChange={setInput}
          error={error}
          disabled={status.kind === 'saving'}
          autoFocus
        />
        <p className="opt-hint">
          Get one at <a href="https://seoanalyst.app/settings/api-keys" target="_blank" rel="noreferrer">seoanalyst.app/settings/api-keys</a>
        </p>
        {inputEnv && (
          <p className="opt-valid">✓ Valid {inputEnv} environment</p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputValid || input.length === 0 || status.kind === 'saving'}
          loading={status.kind === 'saving'}
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {status.kind === 'error' && (
          <p className="opt-error">{status.message}</p>
        )}
      </form>
    </main>
  );
}

function maskKey(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}${'•'.repeat(8)}${key.slice(-4)}`;
}
