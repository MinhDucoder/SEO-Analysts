import type { PublicCheckIssue } from '../api-types';
import { bg, border, severityColor, text } from './styles';

const SUGGESTION_ICON: Record<string, string> = {
  rewrite: '✏️',
  add: '➕',
  remove: '➖',
  reorder: '↔️',
};

export function IssueCard({ issue }: { issue: PublicCheckIssue }) {
  const sevColor = severityColor(issue.severity);
  return (
    <li
      style={{
        background: bg.subtle,
        border: `1px solid ${border.default}`,
        borderLeft: `4px solid ${sevColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-base)', color: text.primary }}>
          {issue.title}
        </span>
        <span
          style={{
            fontSize: 'var(--fs-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: sevColor,
          }}
        >
          {issue.severity}
        </span>
      </div>
      <p
        style={{
          color: text.secondary,
          fontSize: 'var(--fs-sm)',
          margin: '4px 0 0',
          lineHeight: 1.45,
        }}
      >
        {issue.description}
      </p>
      {issue.suggestion && (
        <div
          style={{
            background: bg.surface,
            border: `1px solid ${border.default}`,
            borderRadius: 'var(--radius-xs)',
            padding: 8,
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: text.secondary }}>
            {SUGGESTION_ICON[issue.suggestion.type] ?? '•'}{' '}
            {issue.suggestion.type[0]!.toUpperCase() + issue.suggestion.type.slice(1)}
          </div>
          <div
            style={{
              fontSize: 'var(--fs-sm)',
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              color: text.primary,
              whiteSpace: 'pre-wrap',
            }}
          >
            {issue.suggestion.text}
          </div>
          {issue.suggestion.rationale && (
            <div
              style={{
                fontSize: 'var(--fs-xs)',
                fontStyle: 'italic',
                color: text.tertiary,
                marginTop: 4,
              }}
            >
              {issue.suggestion.rationale}
            </div>
          )}
        </div>
      )}
      {issue.docRef && (
        <a
          href={issue.docRef}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 'var(--fs-xs)',
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            marginTop: 6,
            display: 'inline-block',
          }}
        >
          Learn more →
        </a>
      )}
    </li>
  );
}
