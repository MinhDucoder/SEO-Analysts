import type { CSSProperties } from 'react';
import type { HistoryEntry } from '../history';
import type { Messages } from '../i18n';
import { bg, border, btn, scoreColor, text } from './styles';

export interface HistorySectionProps {
  entries: HistoryEntry[];
  onSelect(id: string): void;
  onReaudit(entry: HistoryEntry): void;
  onClear(): void;
  t: Messages;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: bg.surface,
  border: `1px solid ${border.default}`,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

export function HistorySection({
  entries,
  onSelect,
  onReaudit,
  onClear,
  t,
}: HistorySectionProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-md)', color: text.primary }}>
          {t.historyHeading}
        </span>
        {entries.length > 0 && (
          <button type="button" style={btn.ghost} onClick={onClear}>
            {t.historyClear}
          </button>
        )}
      </header>
      {entries.length === 0 ? (
        <p style={{ color: text.tertiary, fontSize: 'var(--fs-sm)', margin: 0 }}>
          {t.historyEmpty}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((e) => (
            <li
              key={e.id}
              style={row}
              onClick={() => onSelect(e.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') onSelect(e.id);
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: scoreColor(e.score),
                  flex: '0 0 auto',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-sm)',
                    color: text.primary,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {e.url}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: text.tertiary }}>
                  &quot;{e.keyword}&quot; · {relativeTime(e.ranAt)}
                </div>
              </div>
              <span
                style={{
                  fontWeight: 700,
                  color: scoreColor(e.score),
                  fontSize: 'var(--fs-md)',
                  minWidth: 28,
                  textAlign: 'right',
                }}
              >
                {e.score}
              </span>
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onReaudit(e);
                }}
                style={btn.ghost}
                title={t.historyReaudit}
                aria-label={t.historyReaudit}
              >
                ↻
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
