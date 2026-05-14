import type { CSSProperties } from 'react';
import type { Messages } from '../i18n';
import { bg, border, text } from './styles';

export interface KeywordInputProps {
  keyword: string;
  secondary: string[];
  disabled?: boolean;
  onKeywordChange(v: string): void;
  onSecondaryChange(v: string[]): void;
  t: Messages;
}

const MAX_SECONDARY = 5;

const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: bg.muted,
  color: text.primary,
  padding: '2px 6px',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 500,
};

const chipX: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: text.tertiary,
  cursor: 'pointer',
  padding: 0,
  fontSize: 'var(--fs-xs)',
  lineHeight: 1,
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  border: `1px solid ${border.default}`,
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--fs-base)',
  background: bg.surface,
  color: text.primary,
};

export function KeywordInput({
  keyword,
  secondary,
  disabled,
  onKeywordChange,
  onSecondaryChange,
  t,
}: KeywordInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label
        style={{
          fontSize: 'var(--fs-xs)',
          fontWeight: 500,
          color: text.secondary,
        }}
      >
        {t.keywordLabel}
      </label>
      <input
        type="text"
        value={keyword}
        placeholder={t.keywordPlaceholder}
        onChange={(e) => onKeywordChange(e.target.value)}
        disabled={disabled}
        style={inputStyle}
      />
      <label
        style={{
          fontSize: 'var(--fs-xs)',
          fontWeight: 500,
          color: text.secondary,
        }}
      >
        {t.secondaryLabel}
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {secondary.map((kw, i) => (
          <span key={`${kw}-${i}`} style={chip}>
            {kw}
            <button
              type="button"
              onClick={() => onSecondaryChange(secondary.filter((_, j) => j !== i))}
              style={chipX}
              aria-label={`Remove ${kw}`}
            >
              ×
            </button>
          </span>
        ))}
        {secondary.length < MAX_SECONDARY && (
          <SecondaryAdder
            t={t}
            disabled={disabled}
            onAdd={(v) => onSecondaryChange([...secondary, v])}
          />
        )}
      </div>
    </div>
  );
}

function SecondaryAdder({
  t,
  disabled,
  onAdd,
}: {
  t: Messages;
  disabled?: boolean;
  onAdd(v: string): void;
}) {
  return (
    <input
      type="text"
      placeholder={`+ ${t.secondaryAdd}`}
      disabled={disabled}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        const value = e.currentTarget.value.trim();
        if (!value) return;
        onAdd(value);
        e.currentTarget.value = '';
        e.preventDefault();
      }}
      style={{
        flex: '0 0 auto',
        padding: '2px 6px',
        border: `1px dashed ${border.default}`,
        borderRadius: 'var(--radius-xs)',
        fontSize: 'var(--fs-xs)',
        background: 'transparent',
        color: text.tertiary,
        width: 80,
      }}
    />
  );
}
