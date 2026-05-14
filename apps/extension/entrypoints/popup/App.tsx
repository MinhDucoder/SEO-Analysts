import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { API_BASE_URL } from '@/lib/api-base';
import { getDict, loadUiLocale, type Locale } from '@/lib/i18n';
import type { PublicCheckResponse } from '@/lib/api-types';
import type { PublicApiLanguage } from '@/lib/types';
import type { AuditReply, AuditErr } from '@/lib/audit-types';
import { ResultView } from '@/lib/components/ResultView';
import { ErrorView } from '@/lib/components/ErrorView';
import { bg, border, btn, tag, text } from '@/lib/components/styles';

type Mode =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; result: PublicCheckResponse }
  | { kind: 'error'; err: AuditErr };

function hostLabel(): string {
  try {
    return new URL(API_BASE_URL).host;
  } catch {
    return API_BASE_URL;
  }
}

export function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [env, setEnv] = useState<'live' | 'test' | null>(null);
  const [locale, setLocale] = useState<Locale>('vi');
  const [keyword, setKeyword] = useState('');
  const [language, setLanguage] = useState<PublicApiLanguage>('vi');
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });

  const t = getDict(locale);

  useEffect(() => {
    void loadApiKey().then((k) => {
      setHasKey(!!k);
      if (k) setEnv(parseApiKeyEnvironment(k));
    });
    void loadUiLocale().then(setLocale);
  }, []);

  async function runAudit() {
    if (!keyword.trim()) return;
    setMode({ kind: 'running' });
    const reply = (await chrome.runtime.sendMessage({
      type: 'AUDIT_PAGE',
      targetKeyword: keyword,
      language,
    })) as AuditReply;
    if (reply.ok) setMode({ kind: 'ok', result: reply.result });
    else setMode({ kind: 'error', err: reply });
  }

  function openOptions() {
    void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }

  function openSidePanel() {
    void (async () => {
      const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (tab?.id != null) {
        await chrome.sidePanel.open({ tabId: tab.id });
        window.close();
      }
    })();
  }

  if (hasKey === null) return <main style={mainStyle}>Loading…</main>;
  if (hasKey === false) {
    return (
      <main style={mainStyle}>
        <h1 style={h1}>{t.popupHeading}</h1>
        <p style={{ color: text.secondary, fontSize: 'var(--fs-sm)' }}>
          {t.emptyDesc}
        </p>
        <button type="button" style={btn.primary} onClick={openOptions}>
          {t.btnOpenSettings}
        </button>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <header style={headerStyle}>
        <h1 style={h1}>{t.popupHeading}</h1>
        {env && <span style={tag(env === 'live' ? 'live' : 'test')}>{env}</span>}
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAudit();
        }}
        style={{ display: 'flex', gap: 8, marginBottom: 12 }}
      >
        <input
          type="text"
          placeholder={t.keywordPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={inputStyle}
          disabled={mode.kind === 'running'}
        />
        <button
          type="submit"
          style={btn.primary}
          disabled={!keyword.trim() || mode.kind === 'running'}
        >
          {mode.kind === 'running' ? t.btnAuditing : t.btnAudit}
        </button>
      </form>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: text.secondary }}>
          {t.languageLabel}:
        </span>
        <SegmentedLang value={language} onChange={setLanguage} />
      </div>
      {mode.kind === 'ok' && <ResultView result={mode.result} t={t} />}
      {mode.kind === 'error' && (
        <ErrorView
          err={mode.err}
          onOpenOptions={openOptions}
          onRetry={() => void runAudit()}
          t={t}
        />
      )}
      <footer style={footer}>
        <span style={hostLabelStyle}>{hostLabel()}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btn.ghost} onClick={openSidePanel}>
            {t.btnOpenSidePanel}
          </button>
          <button type="button" style={btn.ghost} onClick={openOptions}>
            {t.btnManageKey}
          </button>
        </div>
      </footer>
    </main>
  );
}

function SegmentedLang({
  value,
  onChange,
}: {
  value: PublicApiLanguage;
  onChange: (v: PublicApiLanguage) => void;
}) {
  const cell = (active: boolean) => ({
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: 'var(--fs-xs)',
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
        gap: 0,
        background: bg.subtle,
        border: `1px solid ${border.default}`,
        borderRadius: 'var(--radius-xs)',
        padding: 2,
      }}
    >
      <button type="button" style={cell(value === 'vi')} onClick={() => onChange('vi')}>
        vi
      </button>
      <button type="button" style={cell(value === 'en')} onClick={() => onChange('en')}>
        en
      </button>
    </div>
  );
}

const mainStyle = {
  width: 380,
  minHeight: 120,
  padding: 12,
  fontFamily: 'var(--font-display)',
  color: text.primary,
  background: bg.surface,
  fontSize: 'var(--fs-base)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
};

const h1 = {
  fontSize: 'var(--fs-lg)',
  margin: 0,
  flex: 1,
  color: text.primary,
};

const inputStyle = {
  flex: 1,
  padding: '6px 10px',
  border: `1px solid ${border.default}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--fs-base)',
  background: bg.surface,
  color: text.primary,
};

const footer = {
  marginTop: 12,
  paddingTop: 8,
  borderTop: `1px solid ${border.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const hostLabelStyle = {
  fontSize: 'var(--fs-xs)',
  color: text.tertiary,
  fontFamily: 'var(--font-mono)',
};
