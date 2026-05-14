import { useEffect, useState } from 'react';
import {
  clearApiKey,
  isValidApiKeyFormat,
  loadApiKey,
  parseApiKeyEnvironment,
  saveApiKey,
} from '@/lib/storage';
import { getDict, loadUiLocale, saveUiLocale, type Locale } from '@/lib/i18n';
import { applyTheme, type ThemeMode } from '@/lib/tokens';
import { bg, border, btn, sev, tag, text } from '@/lib/components/styles';
import type { ApiKeyEnvironment } from '@/lib/types';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; env: ApiKeyEnvironment }
  | { kind: 'error'; message: string };

const THEME_KEY = 'theme';

async function loadTheme(): Promise<ThemeMode> {
  try {
    const out = (await chrome.storage.local.get(THEME_KEY)) as Record<string, unknown>;
    const v = out[THEME_KEY];
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // fall through
  }
  return 'system';
}

async function persistTheme(t: ThemeMode): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: t });
}

export function App() {
  const [input, setInput] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<ThemeMode>('system');

  const t = getDict(locale);

  useEffect(() => {
    void loadApiKey().then(setExisting);
    void loadUiLocale().then(setLocale);
    void loadTheme().then((m) => {
      setTheme(m);
      applyTheme(m);
    });
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
      await chrome.runtime.sendMessage({
        type: 'API_KEY_SAVED',
        environment: env ?? 'test',
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : t.optionsErrFormat,
      });
    }
  }

  async function handleClear() {
    await clearApiKey();
    setExisting(null);
    setStatus({ kind: 'idle' });
    await chrome.runtime.sendMessage({ type: 'API_KEY_CLEARED' });
  }

  async function changeLocale(next: Locale) {
    setLocale(next);
    await saveUiLocale(next);
  }

  async function changeTheme(next: ThemeMode) {
    setTheme(next);
    applyTheme(next);
    await persistTheme(next);
  }

  const isInputValid = input.length === 0 || isValidApiKeyFormat(input.trim());
  const env = existing ? parseApiKeyEnvironment(existing) : null;
  const maskedExisting = existing
    ? `${existing.slice(0, 12)}…${existing.slice(-4)}`
    : null;

  return (
    <main style={main}>
      <header style={headerRow}>
        <h1 style={h1}>{t.optionsTitle}</h1>
        <LangToggle locale={locale} onChange={changeLocale} />
      </header>
      <p style={intro}>{t.optionsIntro}</p>

      {maskedExisting ? (
        <section style={card}>
          <div style={row}>
            <strong style={{ color: text.primary }}>{t.optionsSavedKey}</strong>
            <span style={kbd}>{maskedExisting}</span>
            {env && <span style={tag(env === 'live' ? 'live' : 'test')}>{env}</span>}
          </div>
          <button type="button" style={btn.danger} onClick={handleClear}>
            {t.optionsForgetKey}
          </button>
        </section>
      ) : (
        <p style={warn}>{t.errMissingKey}</p>
      )}

      <form onSubmit={handleSave} style={form}>
        <label htmlFor="apiKey" style={label}>
          {existing ? t.optionsReplaceKey : t.optionsAddTitle}
        </label>
        <input
          id="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={t.optionsKeyPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: isInputValid ? border.default : sev.error,
          }}
        />
        {!isInputValid && <p style={{ color: sev.error, fontSize: 'var(--fs-sm)', margin: 0 }}>{t.optionsErrFormat}</p>}
        <p style={hint}>{t.optionsAddHint}</p>
        <button
          type="submit"
          disabled={!input || !isInputValid || status.kind === 'saving'}
          style={{ ...btn.primary, alignSelf: 'flex-start' }}
        >
          {status.kind === 'saving' ? t.optionsSaving : t.optionsSave}
        </button>
      </form>

      {status.kind === 'saved' && (
        <p style={{ color: 'var(--sev-success)', fontSize: 'var(--fs-md)', marginTop: 12 }}>
          {t.optionsSavedToast(status.env)}
        </p>
      )}
      {status.kind === 'error' && (
        <p style={{ color: sev.error, fontSize: 'var(--fs-sm)' }}>{status.message}</p>
      )}

      <section style={card}>
        <strong style={{ color: text.primary }}>{t.optionsThemeLabel}</strong>
        <ThemePicker value={theme} onChange={changeTheme} t={t} />
      </section>

      <section style={trustCard}>
        <strong style={{ color: text.primary }}>{t.optionsTrustTitle}</strong>
        <p style={{ color: text.secondary, fontSize: 'var(--fs-sm)', margin: 0, lineHeight: 1.5 }}>
          {t.optionsTrustDesc}
        </p>
      </section>
    </main>
  );
}

function LangToggle({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  const cell = (active: boolean) => ({
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
    fontWeight: 600,
    background: active ? 'var(--accent-primary)' : 'transparent',
    color: active ? 'var(--accent-on-primary)' : text.secondary,
    border: 'none',
    borderRadius: 'var(--radius-xs)',
  });
  return (
    <div
      style={{
        display: 'inline-flex',
        background: bg.subtle,
        border: `1px solid ${border.default}`,
        borderRadius: 'var(--radius-xs)',
        padding: 2,
      }}
    >
      <button type="button" style={cell(locale === 'vi')} onClick={() => onChange('vi')}>
        VI
      </button>
      <button type="button" style={cell(locale === 'en')} onClick={() => onChange('en')}>
        EN
      </button>
    </div>
  );
}

function ThemePicker({
  value,
  onChange,
  t,
}: {
  value: ThemeMode;
  onChange: (m: ThemeMode) => void;
  t: ReturnType<typeof getDict>;
}) {
  const cell = (active: boolean) => ({
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
    fontWeight: 500,
    background: active ? 'var(--accent-primary)' : bg.subtle,
    color: active ? 'var(--accent-on-primary)' : text.secondary,
    border: `1px solid ${active ? 'var(--accent-primary)' : border.default}`,
    borderRadius: 'var(--radius-xs)',
  });
  return (
    <div style={{ display: 'inline-flex', gap: 6, marginTop: 8 }}>
      <button type="button" style={cell(value === 'system')} onClick={() => onChange('system')}>
        {t.optionsThemeSystem}
      </button>
      <button type="button" style={cell(value === 'light')} onClick={() => onChange('light')}>
        {t.optionsThemeLight}
      </button>
      <button type="button" style={cell(value === 'dark')} onClick={() => onChange('dark')}>
        {t.optionsThemeDark}
      </button>
    </div>
  );
}

const main = {
  maxWidth: 560,
  margin: '40px auto',
  padding: '0 24px',
  fontFamily: 'var(--font-display)',
  color: text.primary,
  background: bg.canvas,
  minHeight: '100vh',
};

const headerRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const h1 = { fontSize: 'var(--fs-3xl)', margin: 0, color: text.primary };

const intro = {
  color: text.secondary,
  fontSize: 'var(--fs-md)',
  lineHeight: 1.55,
  marginTop: 8,
};

const card = {
  background: bg.surface,
  border: `1px solid ${border.default}`,
  padding: 16,
  borderRadius: 'var(--radius-md)',
  marginTop: 16,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
};

const trustCard = {
  ...card,
  background: bg.subtle,
};

const row = { display: 'flex', alignItems: 'center', gap: 8, margin: 0 };

const kbd = {
  fontFamily: 'var(--font-mono)',
  background: bg.surface,
  border: `1px solid ${border.default}`,
  padding: '2px 6px',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--fs-base)',
  color: text.primary,
};

const warn = {
  background: 'var(--sev-warning-bg)',
  border: `1px solid var(--sev-warning)`,
  padding: 12,
  borderRadius: 'var(--radius-sm)',
  color: 'var(--sev-warning)',
  fontSize: 'var(--fs-md)',
};

const form = { marginTop: 24, display: 'flex', flexDirection: 'column' as const, gap: 8 };

const label = { fontSize: 'var(--fs-sm)', fontWeight: 600, color: text.secondary };

const inputStyle = {
  padding: '8px 12px',
  border: `1px solid ${border.default}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--fs-md)',
  fontFamily: 'var(--font-mono)',
  background: bg.surface,
  color: text.primary,
};

const hint = {
  color: text.tertiary,
  fontSize: 'var(--fs-sm)',
  margin: 0,
};
