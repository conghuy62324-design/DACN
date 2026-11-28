import React, { useId } from 'react';
import { Lock } from 'lucide-react';

// Bộ trường form back-office. Nhãn 13/600 trên ô; lỗi ngay dưới ô (aria-describedby).

interface BaseFieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  /** Hiện bộ đếm "n/max" (cần maxLength). */
  counter?: boolean;
  /** Chiếm cả hàng trong lưới 2 cột. */
  span?: boolean;
  className?: string;
}

interface FieldShellProps extends BaseFieldProps {
  id: string;
  length?: number;
  max?: number;
  children: React.ReactNode;
  as?: 'label' | 'div';
}

export function describedBy(id: string, hint?: React.ReactNode, error?: string | null) {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

export const RequiredMark: React.FC = () => (
  <>
    <span className="hgbo-req" aria-hidden="true">*</span>
    <span className="hgbo-sr"> (bắt buộc)</span>
  </>
);

export const FieldShell: React.FC<FieldShellProps> = ({ id, label, hint, error, required, counter, span, className = '', length = 0, max, children }) => (
  <div className={`hgbo-field ${span ? 'hgbo-field--span' : ''} ${className}`.trim()}>
    <label className="hgbo-field__label" htmlFor={id}>
      {label}
      {required && <RequiredMark />}
    </label>
    {children}
    {(hint || error || (counter && max)) && (
      <div className="hgbo-field__foot">
        <div>
          {error && <p className="hgbo-field__error" id={`${id}-error`}>{error}</p>}
          {hint && <p className="hgbo-field__hint" id={`${id}-hint`}>{hint}</p>}
        </div>
        {counter && max ? (
          <span className={`hgbo-counter ${length > max ? 'is-over' : ''}`.trim()} aria-live="polite">
            {length}/{max}
          </span>
        ) : null}
      </div>
    )}
  </div>
);

export type TextFieldProps = BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
};

export const TextField: React.FC<TextFieldProps> = ({ label, hint, error, required, counter, span, className, value, onChange, id, maxLength, type = 'text', ...rest }) => {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} counter={counter} span={span} className={className} length={value.length} max={maxLength}>
      <input
        id={fid}
        className="hgbo-input"
        type={type}
        value={value}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
    </FieldShell>
  );
};

export type NumberFieldProps = BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

export const NumberField: React.FC<NumberFieldProps> = ({ label, hint, error, required, span, className, value, onChange, id, ...rest }) => {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} span={span} className={className}>
      <input
        id={fid}
        className="hgbo-input hgbo-num"
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        {...rest}
      />
    </FieldShell>
  );
};

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectFieldProps = BaseFieldProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

export const SelectField: React.FC<SelectFieldProps> = ({ label, hint, error, required, span, className, value, onChange, options, placeholder, id, ...rest }) => {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} span={span} className={className}>
      <select
        id={fid}
        className="hgbo-select"
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
    </FieldShell>
  );
};

export type TextareaFieldProps = BaseFieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
};

export const TextareaField: React.FC<TextareaFieldProps> = ({ label, hint, error, required, counter, span, className, value, onChange, id, maxLength, rows = 4, ...rest }) => {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} counter={counter} span={span} className={className} length={value.length} max={maxLength}>
      <textarea
        id={fid}
        className="hgbo-textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
    </FieldShell>
  );
};

export type DateFieldProps = Omit<TextFieldProps, 'type' | 'counter'>;

export const DateField: React.FC<DateFieldProps> = (props) => <TextField {...props} type="date" />;

export const DateTimeField: React.FC<DateFieldProps> = (props) => <TextField {...props} type="datetime-local" />;

export interface CheckboxOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  /** Hiện khóa 🔒 (vd. SUPER_ADMIN). */
  locked?: boolean;
  title?: string;
}

export interface CheckboxGroupProps {
  legend: React.ReactNode;
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: 1 | 2 | 3;
  hint?: React.ReactNode;
  error?: string | null;
  disabled?: boolean;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ legend, options, value, onChange, columns = 2, hint, error, disabled }) => {
  const id = useId();
  const toggle = (key: string, checked: boolean) => onChange(checked ? [...value.filter((v) => v !== key), key] : value.filter((v) => v !== key));
  return (
    <fieldset className="hgbo-checks" aria-describedby={describedBy(id, hint, error)}>
      <legend className="hgbo-field__label">{legend}</legend>
      <div className={`hgbo-checks__grid hgbo-checks__grid--${columns}`}>
        {options.map((option) => (
          <label key={option.value} className={`hgbo-check ${option.locked ? 'is-locked' : ''}`.trim()} title={option.title}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              disabled={disabled || option.disabled || option.locked}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            {option.label}
            {option.locked && <Lock size={14} aria-label="Đã khóa" />}
          </label>
        ))}
      </div>
      {error && <p className="hgbo-field__error" id={`${id}-error`}>{error}</p>}
      {hint && <p className="hgbo-field__hint" id={`${id}-hint`}>{hint}</p>}
    </fieldset>
  );
};

export interface TriStateFieldProps {
  label: React.ReactNode;
  /** true = Có, false = Không, null = Chưa rõ (không ép thành Không). */
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  hint?: React.ReactNode;
  disabled?: boolean;
}

export const TriStateField: React.FC<TriStateFieldProps> = ({ label, value, onChange, hint, disabled }) => {
  const name = useId();
  const choices: [string, boolean | null][] = [['Có', true], ['Không', false], ['Chưa rõ', null]];
  return (
    <fieldset className="hgbo-checks" disabled={disabled}>
      <legend className="hgbo-field__label">{label}</legend>
      <div className="hgbo-tri">
        {choices.map(([text, choice]) => (
          <label key={text}>
            <input
              type="radio"
              name={name}
              checked={value === choice}
              onChange={() => onChange(choice)}
            />
            {text}
          </label>
        ))}
      </div>
      {hint && <p className="hgbo-field__hint">{hint}</p>}
    </fieldset>
  );
};

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  /** Ẩn nhãn (vẫn có cho screen reader). */
  hideLabel?: boolean;
  disabled?: boolean;
  title?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, hideLabel, disabled, title }) => (
  <button
    type="button"
    role="switch"
    className="hgbo-switch"
    aria-checked={checked}
    disabled={disabled}
    title={title}
    onClick={() => onChange(!checked)}
  >
    <span className="hgbo-switch__track" aria-hidden="true" />
    <span className={hideLabel ? 'hgbo-sr' : undefined}>{label}</span>
  </button>
);
