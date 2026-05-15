import { useId, type InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export function Input({ label, error, onChange, id, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `input-${rest.name ?? generatedId}`;
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <input
        {...rest}
        id={inputId}
        onChange={(e) => onChange?.(e.target.value)}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && <span id={`${inputId}-error`} className="field-error">{error}</span>}
    </div>
  );
}
