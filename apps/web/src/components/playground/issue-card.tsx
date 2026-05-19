'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PublicCheckIssue, IssueSeverity } from '@/types/api';

const SEVERITY_VARIANT: Record<IssueSeverity, 'error' | 'warn' | 'info'> = {
  error: 'error',
  warning: 'warn',
  info: 'info',
};

export interface IssueCardProps {
  issue: PublicCheckIssue;
  canApply: boolean;
  onApply?: (issue: PublicCheckIssue) => void;
  onCopy?: (issue: PublicCheckIssue) => void;
}

export function IssueCard({ issue, canApply, onApply, onCopy }: IssueCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[issue.severity]}>{issue.severity}</Badge>
          <Badge variant="muted">{issue.category}</Badge>
          {issue.audience.map((a) => (
            <Badge key={a} variant="muted">
              {a}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">#{issue.ruleId}</span>
        </div>
        <h3 className="text-base font-semibold">{issue.title}</h3>
        <p className="text-sm text-muted-foreground">{issue.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(issue.evidence).length > 0 ? (
          <details className="rounded-md border bg-muted/50 p-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Evidence</summary>
            <pre className="mt-2 overflow-x-auto">{JSON.stringify(issue.evidence, null, 2)}</pre>
          </details>
        ) : null}

        {issue.suggestion ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Suggestion · {issue.suggestion.type}
            </div>
            <p className="mt-1 text-sm">{issue.suggestion.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">{issue.suggestion.rationale}</p>
            <div className="mt-3 flex gap-2">
              {canApply ? (
                <Button size="sm" onClick={() => onApply?.(issue)}>
                  Apply to input
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => onCopy?.(issue)}>
                Copy
              </Button>
            </div>
          </div>
        ) : null}
        {issue.docRef ? (
          <a
            href={issue.docRef}
            target="_blank"
            rel="noreferrer"
            className={`${badgeVariants({ variant: 'muted' })} w-fit`}
          >
            Rule docs →
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
