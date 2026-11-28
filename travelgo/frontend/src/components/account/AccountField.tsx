import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, LucideIcon } from 'lucide-react';

interface FieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel';
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  readOnly?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids = [error ? id + '-error' : '', hint ? id + '-hint' : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && (
        <p id={id + '-hint'} className="hg-acc-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={id + '-error'} className="hg-acc-error">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </>
  );
}

export function AccountField({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  error,
  hint,
  placeholder,
  autoComplete,
  inputMode,
  readOnly,
  inputRef,
}: FieldProps) {
  return (
    <div className="hg-acc-field">
      <label htmlFor={id} className="hg-acc-label">
        {label}
      </label>
      <div className={'hg-acc-control' + (Icon ? ' hg-acc-control--icon' : '')}>
        {Icon && <Icon size={18} className="hg-acc-control__icon" aria-hidden="true" />}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className="hg-acc-input"
        />
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  icon: Icon,
  error,
  hint,
  placeholder,
  autoComplete,
  readOnly,
  inputRef,
}: Omit<FieldProps, 'type' | 'inputMode'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="hg-acc-field">
      <label htmlFor={id} className="hg-acc-label">
        {label}
      </label>
      <div className={'hg-acc-control hg-acc-control--toggle' + (Icon ? ' hg-acc-control--icon' : '')}>
        {Icon && <Icon size={18} className="hg-acc-control__icon" aria-hidden="true" />}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className="hg-acc-input"
        />
        <button
          type="button"
          className="hg-acc-eye"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}
