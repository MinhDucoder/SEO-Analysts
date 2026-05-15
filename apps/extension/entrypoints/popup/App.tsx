import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { dispatchErrorCode } from '@/lib/errors';
import { Button, Input, Badge, ScoreRing, IssueCard } from '@/components';
import type { PublicCheckResponse } from '@/lib/api-types';
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
  const banner = aiBanner(result.meta);
  return (
    <section className="popup-result">
      <div className="popup-score">
        <ScoreRing score={result.score} size="lg" label="SEO Score" />
        <p className="popup-stats">
          {result.issues.length} issues · {result.meta.contentStats.words} words
          {result.meta.cached && <> · <Badge variant="cached">cached</Badge></>}
        </p>
      </div>

      {banner && <div className={`popup-banner popup-banner-${banner.tone}`}>{banner.text}</div>}

      <ul className="popup-issues">
        {result.issues.length === 0 && (
          <li className="popup-none">No issues found 🎉</li>
        )}
        {result.issues.map((i, idx) => (
          <li key={`${i.ruleId}-${idx}`}>
            <IssueCard issue={i} />
          </li>
        ))}
      </ul>

      <p className="popup-usage">
        {result.meta.usage.remaining.minute} reqs left / min ·{' '}
        {result.meta.usage.remaining.day} / day
      </p>
    </section>
  );
}

function aiBanner(meta: PublicCheckResponse['meta']): { text: string; tone: 'info' | 'warning' } | null {
  if (meta.suggestionSource === 'llm') {
    return { text: '✨ AI suggestions', tone: 'info' };
  }
  if (meta.suggestionSource === 'mixed') {
    return { text: '✨ AI + template suggestions', tone: 'info' };
  }
  if (meta.suggestionSource === 'template' && meta.enrichMode === 'llm') {
    return { text: '⚠️ Template fallback (AI unavailable)', tone: 'warning' };
  }
  return null;
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
