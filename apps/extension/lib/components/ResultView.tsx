import type { Messages } from '../i18n';
import type { PublicCheckResponse } from '../api-types';
import { IssueCard } from './IssueCard';
import { bg, border, scoreColor, tag, text } from './styles';
import type { Filter } from './FilterBar';

export interface ResultViewProps {
  result: PublicCheckResponse;
  filter?: Filter;
  t: Messages;
}

const SEV_ORDER = { info: 0, warning: 1, error: 2 } as const;

export function ResultView({ result, filter, t }: ResultViewProps) {
  const allIssues = result.issues;
  const issues = filter
    ? allIssues.filter((iss) => {
        if (filter.minSeverity && SEV_ORDER[iss.severity] < SEV_ORDER[filter.minSeverity]) {
          return false;
        }
        if (filter.audiences.size > 0) {
          if (!iss.audience.some((a) => filter.audiences.has(a))) return false;
        }
        return true;
      })
    : allIssues;

  return (
    <section style={{ marginTop: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          paddingBottom: 4,
          borderBottom: `1px solid ${border.default}`,
        }}
      >
        <span style={{ fontSize: 'var(--fs-sm)', color: text.secondary }}>
          {t.scoreLabel}
        </span>
        <span
          style={{
            fontSize: 'var(--fs-2xl)',
            fontWeight: 700,
            color: scoreColor(result.score),
          }}
        >
          {result.score}/100
        </span>
        {result.meta.cached && <span style={tag('cached')}>{t.tagCached}</span>}
        {result.meta.degraded && (
          <span style={tag('degraded')}>{t.tagDegraded}</span>
        )}
      </div>
      <p
        style={{
          color: text.tertiary,
          fontSize: 'var(--fs-sm)',
          margin: '4px 0 8px',
        }}
      >
        {t.stats(
          result.meta.contentStats.words,
          allIssues.length,
          result.meta.processingTimeMs,
        )}
      </p>
      {Object.keys(result.scoreBreakdown).length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {Object.entries(result.scoreBreakdown).map(([k, v]) => (
            <div
              key={k}
              style={{
                flex: 1,
                background: bg.subtle,
                padding: '6px 4px',
                borderRadius: 'var(--radius-xs)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: scoreColor(v) }}>
                {v}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: text.tertiary }}>{k}</div>
            </div>
          ))}
        </div>
      )}
      {filter && allIssues.length > 0 && issues.length < allIssues.length && (
        <p style={{ fontSize: 'var(--fs-xs)', color: text.tertiary, margin: '0 0 6px' }}>
          {t.issuesVisible(issues.length, allIssues.length)}
        </p>
      )}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: 360,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {issues.length === 0 && (
          <li
            style={{
              color: 'var(--sev-success)',
              fontSize: 'var(--fs-base)',
              textAlign: 'center',
              padding: 16,
            }}
          >
            {t.noIssues}
          </li>
        )}
        {issues.map((i, idx) => (
          <IssueCard key={`${i.ruleId}-${idx}`} issue={i} />
        ))}
      </ul>
      <p
        style={{
          fontSize: 'var(--fs-xs)',
          color: text.tertiary,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        {t.usage(result.meta.usage.remaining.minute, result.meta.usage.remaining.day)}
      </p>
    </section>
  );
}
