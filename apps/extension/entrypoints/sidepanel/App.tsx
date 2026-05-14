import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { API_BASE_URL } from '@/lib/api-base';
import { getDict, loadUiLocale, saveUiLocale, type Locale } from '@/lib/i18n';
import { applyTheme } from '@/lib/tokens';
import {
  addHistoryEntry,
  clearHistory,
  getHistoryResult,
  listHistory,
  type HistoryEntry,
} from '@/lib/history';
import type { PublicCheckResponse } from '@/lib/api-types';
import type { PublicApiLanguage } from '@/lib/types';
import type { AuditReply, AuditErr } from '@/lib/audit-types';
import { ResultView } from '@/lib/components/ResultView';
import { ErrorView } from '@/lib/components/ErrorView';
import { KeywordInput } from '@/lib/components/KeywordInput';
import {
  DEFAULT_FILTER,
  FilterBar,
  type Filter,
} from '@/lib/components/FilterBar';
import { HistorySection } from '@/lib/components/HistorySection';
import { accent, bg, border, btn, tag, text } from '@/lib/components/styles';

type Mode =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; result: PublicCheckResponse; fromHistory?: boolean }
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
  const [secondary, setSecondary] = useState<string[]>([]);
  const [language, setLanguage] = useState<PublicApiLanguage>('vi');
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const t = getDict(locale);

  useEffect(() => {
    void loadApiKey().then((k) => {
      setHasKey(!!k);
      if (k) setEnv(parseApiKeyEnvironment(k));
    });
    void loadUiLocale().then(setLocale);
    void refreshHistory();
  }, []);

  async function refreshHistory() {
    setHistory(await listHistory());
  }

  async function runAudit() {
    if (!keyword.trim()) return;
    setMode({ kind: 'running' });
    const reply = (await chrome.runtime.sendMessage({
      type: 'AUDIT_PAGE',
      targetKeyword: keyword,
      language,
      secondaryKeywords: secondary.length ? secondary : undefined,
    })) as AuditReply;
    if (reply.ok) {
      setMode({ kind: 'ok', result: reply.result });
      const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (tab?.url) {
        await addHistoryEntry(reply.result, {
          url: tab.url,
          keyword: keyword.trim(),
          language,
        });
        await refreshHistory();
      }
    } else {
      setMode({ kind: 'error', err: reply });
    }
  }

  async function loadFromHistory(id: string) {
    const result = await getHistoryResult(id);
    if (result) setMode({ kind: 'ok', result, fromHistory: true });
  }

  async function reauditFromHistory(entry: HistoryEntry) {
    setKeyword(entry.keyword);
    setLanguage(entry.language);
    setMode({ kind: 'idle' });
    setTimeout(() => void runAudit(), 0);
  }

  function openOptions() {
    void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }

  async function changeLocale(next: Locale) {
    setLocale(next);
    await saveUiLocale(next);
  }

  if (hasKey === null) return <main style={mainStyle}>Loading…</main>;
  if (hasKey === false) {
    return (
      <main style={mainStyle}>
        <Header env={env} locale={locale} onLocaleChange={changeLocale} t={t} />
        <section
          style={{
            padding: 24,
            textAlign: 'center',
            background: bg.subtle,
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ color: text.secondary, fontSize: 'var(--fs-sm)', margin: '0 0 12px' }}>
            {t.emptyDesc}
          </p>
          <button type="button" style={btn.primary} onClick={openOptions}>
            {t.btnOpenSettings}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Header env={env} locale={locale} onLocaleChange={changeLocale} t={t} />
      <section style={panel}>
        <KeywordInput
          keyword={keyword}
          secondary={secondary}
          disabled={mode.kind === 'running'}
          onKeywordChange={setKeyword}
          onSecondaryChange={setSecondary}
          t={t}
        />
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          language={language}
          onLanguageChange={setLanguage}
          t={t}
        />
        <button
          type="button"
          style={{ ...btn.primary, width: '100%' }}
          onClick={() => void runAudit()}
          disabled={!keyword.trim() || mode.kind === 'running'}
        >
          {mode.kind === 'running' ? t.btnAuditing : t.btnAudit}
        </button>
      </section>
      {mode.kind === 'ok' && <ResultView result={mode.result} filter={filter} t={t} />}
      {mode.kind === 'error' && (
        <ErrorView
          err={mode.err}
          onOpenOptions={openOptions}
          onRetry={() => void runAudit()}
          t={t}
        />
      )}
      <HistorySection
        entries={history}
        onSelect={(id) => void loadFromHistory(id)}
        onReaudit={(e) => void reauditFromHistory(e)}
        onClear={async () => {
          await clearHistory();
          await refreshHistory();
        }}
        t={t}
      />
      <footer style={footer}>
        <span style={hostLabelStyle}>{hostLabel()}</span>
        <button type="button" style={btn.ghost} onClick={openOptions}>
          {t.btnManageKey}
        </button>
      </footer>
    </main>
  );
}

function Header({
  env,
  locale,
  onLocaleChange,
  t,
}: {
  env: 'live' | 'test' | null;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  t: ReturnType<typeof getDict>;
}) {
  useEffect(() => {
    applyTheme('system');
  }, []);
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderBottom: `1px solid ${border.default}`,
        background: bg.subtle,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      <h1
        style={{
          fontSize: 'var(--fs-lg)',
          margin: 0,
          flex: 1,
          color: text.primary,
        }}
      >
        {t.popupHeading}
      </h1>
      {env && <span style={tag(env === 'live' ? 'live' : 'test')}>{env}</span>}
      <button
        type="button"
        style={btn.ghost}
        onClick={() => onLocaleChange(locale === 'vi' ? 'en' : 'vi')}
        title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
      >
        {locale.toUpperCase()}
      </button>
    </header>
  );
}

const mainStyle = {
  width: '100%',
  minWidth: 320,
  maxWidth: 600,
  padding: 0,
  fontFamily: 'var(--font-display)',
  background: bg.surface,
  color: text.primary,
  fontSize: 'var(--fs-base)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
};

const panel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
  padding: '0 16px',
};

const footer = {
  marginTop: 'auto',
  padding: '8px 16px',
  borderTop: `1px solid ${border.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  background: bg.subtle,
};

const hostLabelStyle = {
  fontSize: 'var(--fs-xs)',
  color: text.tertiary,
  fontFamily: 'var(--font-mono)',
};

// Reference accent so tree-shaking keeps the import (used implicitly via
// styles.ts CSS-var values in ResultView headings).
void accent;
