'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PublicCheckOptions, EnrichMode, IssueSeverity, Language } from '@/types/api';

export interface OptionsPanelProps {
  targetKeyword: string;
  secondaryKeywords: string;
  options: PublicCheckOptions;
  onTargetKeywordChange: (v: string) => void;
  onSecondaryKeywordsChange: (v: string) => void;
  onOptionsChange: (v: PublicCheckOptions) => void;
}

export function OptionsPanel(props: OptionsPanelProps) {
  const { targetKeyword, secondaryKeywords, options } = props;
  const filter = options.filter ?? {};

  const patchOptions = (o: Partial<PublicCheckOptions>) =>
    props.onOptionsChange({ ...options, ...o });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="target">Target keyword</Label>
        <Input
          id="target"
          value={targetKeyword}
          onChange={(e) => props.onTargetKeywordChange(e.target.value)}
          placeholder="seo 2026"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="secondary">Secondary keywords (comma-separated, ≤5)</Label>
        <Input
          id="secondary"
          value={secondaryKeywords}
          onChange={(e) => props.onSecondaryKeywordsChange(e.target.value)}
          placeholder="on-page, core web vitals"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="enrich">Enrich mode</Label>
          <Select
            id="enrich"
            value={options.enrichMode ?? 'llm'}
            onChange={(e) => patchOptions({ enrichMode: e.target.value as EnrichMode })}
          >
            <option value="off">off</option>
            <option value="template">template</option>
            <option value="llm">llm</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lang">Language</Label>
          <Select
            id="lang"
            value={options.language ?? 'vi'}
            onChange={(e) => patchOptions({ language: e.target.value as Language })}
          >
            <option value="vi">vi</option>
            <option value="en">en</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="minsev">Minimum severity</Label>
        <Select
          id="minsev"
          value={filter.minSeverity ?? ''}
          onChange={(e) =>
            patchOptions({
              filter: {
                ...filter,
                minSeverity: (e.target.value as IssueSeverity) || undefined,
              },
            })
          }
        >
          <option value="">all</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </Select>
      </div>
    </div>
  );
}
