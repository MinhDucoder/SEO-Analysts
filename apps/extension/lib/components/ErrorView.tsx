import { useEffect, useState } from 'react';
import { dispatchErrorCode } from '../errors';
import type { Messages } from '../i18n';
import type { AuditErr } from '../audit-types';
import { btn, sev, text } from './styles';

export interface ErrorViewProps {
  err: AuditErr;
  onOpenOptions: () => void;
  onRetry: () => void;
  t: Messages;
}

export function ErrorView({ err, onOpenOptions, onRetry, t }: ErrorViewProps) {
  const action = dispatchErrorCode(err.code);
  return (
    <section
      style={{
        background: sev.errorBg,
        border: `1px solid ${sev.error}`,
        borderRadius: 'var(--radius-sm)',
        padding: 10,
        marginTop: 8,
      }}
    >
      <p style={{ color: sev.error, fontSize: 'var(--fs-base)', margin: 0 }}>
        {err.message}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          margin: '4px 0 8px',
        }}
      >
        <p
          style={{
            color: sev.error,
            fontSize: 'var(--fs-xs)',
            margin: 0,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {err.code}
          {err.requestId ? ` · ${err.requestId}` : ''}
          {err.status > 0 ? ` · HTTP ${err.status}` : ''}
        </p>
        {err.requestId && <CopyReqId requestId={err.requestId} t={t} />}
      </div>
      {action === 'OPEN_OPTIONS' && (
        <button type="button" style={btn.primary} onClick={onOpenOptions}>
          {t.btnOpenSettings}
        </button>
      )}
      {action === 'RETRY_LATER' && err.retryAfterSeconds ? (
        <RetryCountdown seconds={err.retryAfterSeconds} onRetry={onRetry} t={t} />
      ) : null}
      {(action === 'INPUT_FIX' ||
        action === 'SHOW_SERVER_OUTAGE' ||
        action === 'SHOW_GENERIC') && (
        <button type="button" style={btn.secondary} onClick={onRetry}>
          {t.btnTryAgain}
        </button>
      )}
    </section>
  );
}

function CopyReqId({ requestId, t }: { requestId: string; t: Messages }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(requestId).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        background: 'transparent',
        border: `1px solid ${sev.error}`,
        color: sev.error,
        cursor: 'pointer',
        fontSize: 'var(--fs-sm)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-xs)',
        lineHeight: 1,
      }}
      aria-label={t.errCopyReqId}
      title={copied ? t.errCopied : t.errCopyReqId}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

function RetryCountdown({
  seconds,
  onRetry,
  t,
}: {
  seconds: number;
  onRetry: () => void;
  t: Messages;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const tid = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(tid);
  }, [left]);
  if (left > 0) {
    return <p style={{ fontSize: 'var(--fs-sm)', color: text.secondary, margin: 0 }}>{t.errRetryIn(left)}</p>;
  }
  return (
    <button type="button" style={btn.primary} onClick={onRetry}>
      {t.btnRetryNow}
    </button>
  );
}
