import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { dispatchErrorCode } from '@/lib/errors';
import { API_BASE_URL } from '@/lib/api-base';
import {
  Button,
  Input,
  Badge,
  ScoreRing,
  ScoreBreakdown,
  IssueCard,
  IssueFilters,
  applyFilters,
  EMPTY_FILTER,
  Toast,
} from '@/components';
import type { FilterState, ToastState } from '@/components';
import type { PublicCheckIssue, PublicCheckResponse } from '@/lib/api-types';
import type { AuditReply, AuditErr } from '../background';

type Mode =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; result: PublicCheckResponse }
  | { kind: 'error'; err: AuditErr };

export function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [env, setEnv] = useState<'live' | 'test' | null>(null);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });

  useEffect(() => {
    void loadApiKey().then((k) => {
      setHasKey(!!k);
      if (k) setEnv(parseApiKeyEnvironment(k));
    });
  }, []);

  async function runAudit() {
    setMode({ kind: 'running' });
    const reply = (await chrome.runtime.sendMessage({
      type: 'AUDIT_PAGE',
      targetKeyword: keyword.trim(),
      language: 'vi',
    })) as AuditReply;
    if (reply.ok) setMode({ kind: 'ok', result: reply.result });
    else setMode({ kind: 'error', err: reply });
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  // === Boot state — skeleton instead of "Loading…" text ===
  if (hasKey === null) {
    return (
      <main className="popup">
        <BootSkeleton />
      </main>
    );
  }

  // === Empty state — no API key ===
  if (hasKey === false) {
    return (
      <main className="popup">
        <header className="popup-header">
          <h1 className="popup-title">SEO Analyst</h1>
        </header>
        <div className="popup-empty">
          <div className="popup-empty-icon" aria-hidden>🔑</div>
          <div className="popup-empty-title">Connect your API key</div>
          <p className="popup-empty-desc">to start auditing pages</p>
          <Button variant="primary" size="md" onClick={openOptions}>
            Open settings
          </Button>
        </div>
      </main>
    );
  }

  // === Audit form + result ===
  return (
    <main className="popup">
      <header className="popup-header">
        <h1 className="popup-title">SEO Analyst</h1>
        {env && (
          <Badge variant="env" tone={env}>{env}</Badge>
        )}
      </header>

      <form
        className="popup-form"
        onSubmit={(e) => { e.preventDefault(); void runAudit(); }}
      >
        <Input
          label="Target keyword"
          placeholder="e.g. seo 2026"
          value={keyword}
          onChange={setKeyword}
          disabled={mode.kind === 'running'}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!keyword.trim() || mode.kind === 'running'}
          loading={mode.kind === 'running'}
        >
          {mode.kind === 'running' ? 'Auditing…' : 'Audit page'}
        </Button>
      </form>

      {mode.kind === 'running' && <LoadingSkeleton />}
      {mode.kind === 'ok' && <ResultView result={mode.result} />}
      {mode.kind === 'error' && (
        <ErrorView err={mode.err} onOpenOptions={openOptions} onRetry={runAudit} />
      )}

      <footer className="popup-footer">
        <Button variant="ghost" size="sm" onClick={openOptions}>
          Manage key
        </Button>
      </footer>
    </main>
  );
}

function BootSkeleton() {
  return (
    <div className="popup-empty">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-button" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="popup-result">
      <div className="skeleton skeleton-ring" />
      <div className="skeleton skeleton-stats" />
      <div className="skeleton skeleton-issue" />
      <div className="skeleton skeleton-issue" />
    </section>
  );
}

function ResultView({ result }: { result: PublicCheckResponse }) {
  const sourceLabel = aiSourceLabel(result.meta);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Re-filter on every state change so the copy button still operates on
  // the visible subset; memoised to avoid recomputing while the toast
  // ticks down its dismiss timer.
  const visibleIssues = useMemo(
    () => applyFilters(result.issues, filters),
    [result.issues, filters],
  );

  // Adapted from apps/web's playground result-viewer onCopy handler —
  // navigator.clipboard guarded for clipboards blocked by policy, with
  // a friendly inline toast either way so the click isn't silent.
  const onCopySuggestion = useCallback((issue: PublicCheckIssue) => {
    const text = issue.suggestion?.text ?? '';
    if (!text) {
      setToast({ message: 'Nothing to copy', tone: 'error', nonce: Date.now() });
      return;
    }
    void navigator.clipboard
      .writeText(text)
      .then(() =>
        setToast({ message: 'Suggestion copied', tone: 'success', nonce: Date.now() }),
      )
      .catch(() =>
        setToast({
          message: 'Copy blocked by browser',
          tone: 'error',
          nonce: Date.now(),
        }),
      );
  }, []);

  return (
    <section className="popup-result">
      <div className="popup-score">
        <ScoreRing score={result.score} size="lg" label="SEO Score" />
        <p className="popup-stats">
          {result.issues.length} issues · {result.meta.contentStats.words} words
          {result.meta.cached && <> · <Badge variant="cached">cached</Badge></>}
          {sourceLabel && <> · <Badge variant="meta">{sourceLabel}</Badge></>}
        </p>
      </div>

      <ScoreBreakdown breakdown={result.scoreBreakdown} />

      <IssueFilters issues={result.issues} value={filters} onChange={setFilters} />

      <ul className="popup-issues">
        {result.issues.length === 0 && (
          <li className="popup-none">No issues found 🎉</li>
        )}
        {result.issues.length > 0 && visibleIssues.length === 0 && (
          <li className="popup-none popup-none-empty">
            No issues match the current filter.
          </li>
        )}
        {visibleIssues.map((i, idx) => (
          <li key={`${i.ruleId}-${idx}`}>
            <IssueCard issue={i} onCopySuggestion={onCopySuggestion} />
          </li>
        ))}
      </ul>

      <p className="popup-usage">
        {result.meta.usage.remaining.minute} reqs left / min ·{' '}
        {result.meta.usage.remaining.day} / day
      </p>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

// Suggestion-source indicator. Previously rendered as a full-width
// rounded banner that looked clickable — users tapped expecting an
// action and got nothing. Now an inline meta badge alongside "issues ·
// words · cached" so the label clearly reads as status, not control.
function aiSourceLabel(meta: PublicCheckResponse['meta']): string | null {
  if (meta.suggestionSource === 'llm') return '✨ AI';
  if (meta.suggestionSource === 'mixed') return '✨ AI + template';
  if (meta.suggestionSource === 'template' && meta.enrichMode === 'llm') {
    return '⚠️ Template fallback';
  }
  return null;
}

/**
 * Derive the web-app base URL from the gateway URL.
 * Dev:  http://localhost:3000  → http://localhost:3001
 * Prod: https://api.seoanalyst.app → https://seoanalyst.app
 * All other values fall back to the API_BASE_URL itself (safe no-op).
 */
function resolveWebBaseUrl(): string {
  return API_BASE_URL
    .replace('http://localhost:3000', 'http://localhost:3001')
    .replace('https://api.seoanalyst.app', 'https://seoanalyst.app');
}

function ErrorView({
  err,
  onOpenOptions,
  onRetry,
}: {
  err: AuditErr;
  onOpenOptions: () => void;
  onRetry: () => void;
}) {
  const action = dispatchErrorCode(err.code);
  return (
    <section className="popup-error">
      <p className="popup-error-msg">{err.message}</p>
      <p className="popup-error-meta">
        {err.code}
        {err.requestId ? ` · ${err.requestId}` : ''}
        {err.status > 0 ? ` · HTTP ${err.status}` : ''}
      </p>
      {action === 'OPEN_OPTIONS' && (
        <Button variant="primary" size="md" onClick={onOpenOptions}>Open settings</Button>
      )}
      {action === 'OPEN_REBIND_PAGE' && (
        <div className="popup-error-detail">
          <p className="popup-error-hint">
            Key đang được bound thiết bị khác. Mở web app → Settings → API Keys → Rebind, hoặc dùng thiết bị gốc.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() =>
              chrome.tabs.create({ url: `${resolveWebBaseUrl()}/settings/api-keys` })
            }
          >
            Open rebind page
          </Button>
        </div>
      )}
      {action === 'RELOAD_EXTENSION' && (
        <p className="popup-error-hint">
          Install id chưa sinh. Hãy reload extension (chrome://extensions → reload).
        </p>
      )}
      {action === 'RETRY_LATER' && (
        <RetryCountdown seconds={err.retryAfterSeconds ?? 30} onRetry={onRetry} />
      )}
      {(action === 'INPUT_FIX' ||
        action === 'SHOW_SERVER_OUTAGE' ||
        action === 'SHOW_GENERIC' ||
        action === 'FALLBACK_TO_HTML' ||
        action === 'REDUCE_PAYLOAD') && (
        <Button variant="secondary" size="md" onClick={onRetry}>Try again</Button>
      )}
    </section>
  );
}

function RetryCountdown({ seconds, onRetry }: { seconds: number; onRetry: () => void }) {
  const [left, setLeft] = useState(seconds);

  // Re-sync when the parent provides a fresh countdown (e.g. user
  // retries and hits a different rate-limit window).
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) return <p className="popup-retry">Retry in {left}s…</p>;
  return <Button variant="primary" size="md" onClick={onRetry}>Retry now</Button>;
}
