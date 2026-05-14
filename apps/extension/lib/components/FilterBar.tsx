import type { CSSProperties } from 'react';
import type { IssueAudience, IssueSeverity } from '../api-types';
import type { PublicApiLanguage } from '../types';
import type { Messages } from '../i18n';
import { accent, bg, border, text } from './styles';

export interface Filter {
  audiences: Set<IssueAudience>;
  minSeverity: IssueSeverity;
}

export const DEFAULT_FILTER: Filter = {
  audiences: new Set(),
  minSeverity: 'info',
};

export interface FilterBarProps {
  filter: Filter;
  onFilterChange(f: Filter): void;
  language: PublicApiLanguage;
  onLanguageChange(l: PublicApiLanguage): void;
  t: Messages;
}

const chip = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 500,
  cursor: 'pointer',
  border: active ? `1px solid ${accent.primary}` : `1px solid ${border.default}`,
  background: active ? accent.primary : bg.subtle,
  color: active ? accent.onPrimary : text.secondary,
});

const SEV_LEVELS: IssueSeverity[] = ['info', 'warning', 'error'];

export function FilterBar({
  filter,
  onFilterChange,
  language,
  onLanguageChange,
  t,
}: FilterBarProps) {
  function toggleAudience(a: IssueAudience) {
    const next = new Set(filter.audiences);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    onFilterChange({ ...filter, audiences: next });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 500, color: text.secondary }}>
        {t.filterLabel}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          style={chip(filter.audiences.has('writer'))}
          onClick={() => toggleAudience('writer')}
        >
          {filter.audiences.has('writer') ? '✓ ' : ''}
          {t.audienceWriter}
        </button>
        <button
          type="button"
          style={chip(filter.audiences.has('dev'))}
          onClick={() => toggleAudience('dev')}
        >
          {filter.audiences.has('dev') ? '✓ ' : ''}
          {t.audienceDev}
        </button>
        <span style={{ width: 1, height: 16, background: border.default, margin: '0 4px' }} />
        {SEV_LEVELS.map((s) => (
          <button
            key={s}
            type="button"
            style={chip(filter.minSeverity === s)}
            onClick={() => onFilterChange({ ...filter, minSeverity: s })}
            title={t.severityLabel}
          >
            ≥ {s}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: border.default, margin: '0 4px' }} />
        <button
          type="button"
          style={chip(language === 'vi')}
          onClick={() => onLanguageChange('vi')}
        >
          vi
        </button>
        <button
          type="button"
          style={chip(language === 'en')}
          onClick={() => onLanguageChange('en')}
        >
          en
        </button>
      </div>
    </div>
  );
}
