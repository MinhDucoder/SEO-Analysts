import { useEffect, useState } from 'react';
import { loadApiKey, parseApiKeyEnvironment } from '@/lib/storage';
import { dispatchErrorCode } from '@/lib/errors';
import type {
  PublicCheckIssue,
  PublicCheckResponse,
  IssueSeverity,
} from '@/lib/api-types';
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
      targetKeyword: keyword,
      language: 'vi',
    })) as AuditReply;
    if (reply.ok) setMode({ kind: 'ok', result: reply.result });
    else setMode({ kind: 'error', err: reply });
  }

  function openOptions() {
    // Popup is an extension context → can call openOptionsPage()
    // directly. The previous version routed through the service worker
    // via sendMessage, which silently dropped when the SW had idled out
    // (chrome.runtime.sendMessage on an inactive SW resolves with
    // undefined and the user's click vanishes).
    chrome.runtime.openOptionsPage();
  }

  if (hasKey === null) return <main style={styles.main}>Loading…</main>;
  if (hasKey === false) {
    return (
      <main style={styles.main}>
        <h1 style={styles.h1}>SEO Analyst</h1>
        <p style={styles.warn}>No API key saved.</p>
        <button type="button" style={styles.btnPrimary} onClick={openOptions}>
          Set up API key
        </button>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.h1}>SEO Analyst</h1>
        <span style={env === 'live' ? styles.tagLive : styles.tagTest}>
          {env ?? '?'}
        </span>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAudit();
        }}
        style={styles.form}
      >
        <input
          type="text"
          placeholder="Target keyword (e.g. seo 2026)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={styles.input}
          disabled={mode.kind === 'running'}
        />
        <button
          type="submit"
          style={styles.btnPrimary}
          disabled={!keyword || mode.kind === 'running'}
        >
          {mode.kind === 'running' ? 'Auditing…' : 'Audit page'}
        </button>
      </form>
      {mode.kind === 'ok' && <ResultView result={mode.result} />}
      {mode.kind === 'error' && (
        <ErrorView err={mode.err} onOpenOptions={openOptions} onRetry={runAudit} />
      )}
      <footer style={styles.footer}>
        <button type="button" style={styles.linkBtn} onClick={openOptions}>
          Manage key
        </button>
      </footer>
    </main>
  );
}

function ResultView({ result }: { result: PublicCheckResponse }) {
  const scoreColor =
    result.score >= 80 ? '#15803d' : result.score >= 60 ? '#b45309' : '#dc2626';
  return (
    <section style={styles.result}>
      <div style={styles.scoreRow}>
        <span style={styles.scoreLabel}>Score</span>
        <span style={{ ...styles.scoreValue, color: scoreColor }}>
          {result.score}/100
        </span>
        {result.meta.cached && <span style={styles.cachedTag}>cached</span>}
        {result.meta.degraded && <span style={styles.degradedTag}>template-fallback</span>}
      </div>
      <p style={styles.stats}>
        {result.meta.contentStats.words} words · {result.issues.length} issues ·{' '}
        {result.meta.processingTimeMs}ms
      </p>
      <ul style={styles.issues}>
        {result.issues.length === 0 && (
          <li style={styles.noneFound}>No issues found 🎉</li>
        )}
        {result.issues.map((i, idx) => (
          <IssueCard key={`${i.ruleId}-${idx}`} issue={i} />
        ))}
      </ul>
      <p style={styles.usage}>
        {result.meta.usage.remaining.minute} reqs left / min ·{' '}
        {result.meta.usage.remaining.day} / day
      </p>
    </section>
  );
}

function IssueCard({ issue }: { issue: PublicCheckIssue }) {
  return (
    <li style={{ ...styles.issue, borderLeftColor: severityColor(issue.severity) }}>
      <div style={styles.issueHeader}>
        <span style={styles.issueTitle}>{issue.title}</span>
        <span style={{ ...styles.severity, color: severityColor(issue.severity) }}>
          {issue.severity}
        </span>
      </div>
      <p style={styles.issueDesc}>{issue.description}</p>
      {issue.suggestion && (
        <div style={styles.suggestion}>
          <div style={styles.suggestionLabel}>
            {issue.suggestion.type === 'rewrite'
              ? '✏️ Rewrite'
              : issue.suggestion.type === 'add'
                ? '➕ Add'
                : issue.suggestion.type === 'remove'
                  ? '➖ Remove'
                  : '↔️ Reorder'}
          </div>
          <div style={styles.suggestionText}>{issue.suggestion.text}</div>
          {issue.suggestion.rationale && (
            <div style={styles.suggestionRationale}>{issue.suggestion.rationale}</div>
          )}
        </div>
      )}
      {issue.docRef && (
        <a
          href={issue.docRef}
          target="_blank"
          rel="noreferrer"
          style={styles.docLink}
        >
          Learn more →
        </a>
      )}
    </li>
  );
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
    <section style={styles.errorBox}>
      <p style={styles.errorMsg}>{err.message}</p>
      <p style={styles.errorMeta}>
        {err.code}
        {err.requestId ? ` · ${err.requestId}` : ''}
        {err.status > 0 ? ` · HTTP ${err.status}` : ''}
      </p>
      {action === 'OPEN_OPTIONS' && (
        <button type="button" style={styles.btnPrimary} onClick={onOpenOptions}>
          Open settings
        </button>
      )}
      {action === 'RETRY_LATER' && err.retryAfterSeconds && (
        <RetryCountdown seconds={err.retryAfterSeconds} onRetry={onRetry} />
      )}
      {(action === 'INPUT_FIX' || action === 'SHOW_SERVER_OUTAGE' || action === 'SHOW_GENERIC') && (
        <button type="button" style={styles.btnSecondary} onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}

function RetryCountdown({
  seconds,
  onRetry,
}: {
  seconds: number;
  onRetry: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) {
    return <p style={styles.retryText}>Retry in {left}s…</p>;
  }
  return (
    <button type="button" style={styles.btnPrimary} onClick={onRetry}>
      Retry now
    </button>
  );
}

function severityColor(s: IssueSeverity): string {
  return s === 'error' ? '#dc2626' : s === 'warning' ? '#b45309' : '#0284c7';
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    width: 380,
    minHeight: 120,
    padding: 12,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f172a',
    fontSize: 13,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  h1: { fontSize: 15, margin: 0, flex: 1 },
  tagLive: {
    background: '#dcfce7',
    color: '#15803d',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  tagTest: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  warn: { color: '#854d0e', fontSize: 13 },
  form: { display: 'flex', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  },
  btnPrimary: {
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
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#1d4ed8',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
  },
  result: { marginTop: 8 },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #e2e8f0',
  },
  scoreLabel: { fontSize: 12, color: '#64748b' },
  scoreValue: { fontSize: 22, fontWeight: 700 },
  cachedTag: {
    fontSize: 10,
    background: '#fef3c7',
    color: '#92400e',
    padding: '2px 6px',
    borderRadius: 4,
  },
  degradedTag: {
    fontSize: 10,
    background: '#e0e7ff',
    color: '#3730a3',
    padding: '2px 6px',
    borderRadius: 4,
  },
  stats: { color: '#64748b', fontSize: 12, margin: '4px 0 8px' },
  issues: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    maxHeight: 360,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  noneFound: { color: '#15803d', fontSize: 13, textAlign: 'center', padding: 16 },
  issue: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid',
    borderRadius: 6,
    padding: 10,
  },
  issueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  issueTitle: { fontWeight: 600, fontSize: 13 },
  severity: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  issueDesc: { color: '#475569', fontSize: 12, margin: '4px 0 0' },
  suggestion: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  suggestionLabel: { fontSize: 11, fontWeight: 600, color: '#64748b' },
  suggestionText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  suggestionRationale: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 4,
  },
  docLink: {
    fontSize: 11,
    color: '#1d4ed8',
    textDecoration: 'none',
    marginTop: 6,
    display: 'inline-block',
  },
  usage: { fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  errorMsg: { color: '#991b1b', fontSize: 13, margin: 0 },
  errorMeta: {
    color: '#7f1d1d',
    fontSize: 11,
    margin: '4px 0 8px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  retryText: { fontSize: 12, color: '#475569', margin: 0 },
  footer: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px solid #e2e8f0',
    textAlign: 'right',
  },
};
