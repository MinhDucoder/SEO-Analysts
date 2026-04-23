'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { ScoreCard } from './score-card';
import { IssueCard } from './issue-card';
import type {
  IssueAudience,
  IssueSeverity,
  PublicCheckIssue,
  PublicCheckResponse,
} from '@/types/api';

const SEVERITY_ORDER: Record<IssueSeverity, number> = { info: 0, warning: 1, error: 2 };

export interface ResultViewerProps {
  response: PublicCheckResponse;
  canApply: boolean;
  onApply: (issue: PublicCheckIssue) => void;
}

interface FilterState {
  category: string;
  audience: IssueAudience | '';
  minSeverity: IssueSeverity | '';
}

export function ResultViewer({ response, canApply, onApply }: ResultViewerProps) {
  const [filters, setFilters] = React.useState<FilterState>({
    category: '',
    audience: '',
    minSeverity: '',
  });

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of response.issues) set.add(i.category);
    return Array.from(set).sort();
  }, [response.issues]);

  const filtered = React.useMemo(() => {
    return response.issues.filter((i) => {
      if (filters.category && i.category !== filters.category) return false;
      if (filters.audience && !i.audience.includes(filters.audience as IssueAudience)) return false;
      if (filters.minSeverity && SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[filters.minSeverity]) {
        return false;
      }
      return true;
    });
  }, [response.issues, filters]);

  return (
    <div className="space-y-4">
      <ScoreCard response={response} />

      {response.summary ? (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div>
            <span className="font-medium">Writer:</span> {response.summary.writer}
          </div>
          <div>
            <span className="font-medium">Dev:</span> {response.summary.dev}
          </div>
        </div>
      ) : null}

      <Separator />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">all</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audience</Label>
          <Select
            value={filters.audience}
            onChange={(e) =>
              setFilters((f) => ({ ...f, audience: e.target.value as IssueAudience | '' }))
            }
          >
            <option value="">all</option>
            <option value="writer">writer</option>
            <option value="dev">dev</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Min severity</Label>
          <Select
            value={filters.minSeverity}
            onChange={(e) =>
              setFilters((f) => ({ ...f, minSeverity: e.target.value as IssueSeverity | '' }))
            }
          >
            <option value="">all</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {response.issues.length} issues
      </p>

      <div className="space-y-3">
        {filtered.map((issue) => (
          <IssueCard
            key={issue.ruleId}
            issue={issue}
            canApply={canApply && issue.suggestion !== null}
            onApply={onApply}
            onCopy={(iss) => {
              navigator.clipboard.writeText(iss.suggestion?.text ?? '');
              toast.success('Suggestion copied');
            }}
          />
        ))}
      </div>
    </div>
  );
}
