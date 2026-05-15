import type { PublicCheckIssue } from '../lib/api-types';
import { Badge } from './Badge';

const SUGGESTION_ICON: Record<string, string> = {
  rewrite: '✏️',
  add: '➕',
  remove: '➖',
  reorder: '↔️',
};

interface IssueCardProps {
  issue: PublicCheckIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <article className={`issue issue-${issue.severity}`}>
      <header className="issue-header">
        <h3 className="issue-title">{issue.title}</h3>
        <Badge variant="severity" tone={issue.severity}>
          {issue.severity}
        </Badge>
      </header>
      <p className="issue-desc">{issue.description}</p>

      {issue.suggestion && (
        <div className="issue-suggestion">
          <div className="issue-suggestion-label">
            <span aria-hidden>{SUGGESTION_ICON[issue.suggestion.type] ?? '💡'}</span>{' '}
            {issue.suggestion.type.charAt(0).toUpperCase() + issue.suggestion.type.slice(1)}
          </div>
          <div className="issue-suggestion-text">{issue.suggestion.text}</div>
          {issue.suggestion.rationale && (
            <div className="issue-suggestion-rationale">{issue.suggestion.rationale}</div>
          )}
        </div>
      )}

      {issue.docRef && (
        <a className="issue-doc" href={issue.docRef} target="_blank" rel="noreferrer">
          Learn more →
        </a>
      )}
    </article>
  );
}
