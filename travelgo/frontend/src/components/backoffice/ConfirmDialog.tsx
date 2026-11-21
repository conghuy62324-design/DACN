import React, { useEffect, useId, useRef, useState } from 'react';
import { Portal, useFocusTrap, useScrollLock } from './overlay';
import { BoButton } from './BoButton';
import { Alert } from './States';
import { errorMessage } from './format';

export interface ConfirmReasonConfig {
  required: boolean;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  presets?: string[];
}

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Danh sách hậu quả (khối nền warning). */
  impact?: React.ReactNode;
  tone?: 'default' | 'danger';
  confirmLabel: string;
  cancelLabel?: string;
  reason?: ConfirmReasonConfig;
  /** Lỗi ném ra → giữ dialog mở, hiện alert, không xóa lý do. Thành công → tự đóng. */
  onConfirm: (reason?: string) => Promise<void> | void;
  onClose: () => void;
  /** Đổi lỗi API → thông điệp tiếng Việt (mặc định dùng message của server). */
  mapError?: (error: unknown) => string;
  children?: React.ReactNode;
}

/** Thay cho hộp thoại confirm/prompt của trình duyệt. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  impact,
  tone = 'default',
  confirmLabel,
  cancelLabel = 'Hủy bỏ',
  reason,
  onConfirm,
  onClose,
  mapError,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const min = reason?.min ?? 3;
  const max = reason?.max ?? 500;

  useEffect(() => {
    if (open) {
      setText('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  useFocusTrap(open, ref, busy ? undefined : onClose, { initialFocus: reason ? textRef : undefined });
  useScrollLock(open);
  if (!open) return null;

  const trimmed = text.trim();
  const lengthOk = trimmed.length === 0 ? !reason?.required : trimmed.length >= min && trimmed.length <= max;
  const valid = !reason || lengthOk;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason ? trimmed || undefined : undefined);
      setBusy(false);
      onClose();
    } catch (requestError) {
      setBusy(false);
      setError(mapError ? mapError(requestError) : errorMessage(requestError, 'Không thực hiện được thao tác. Vui lòng thử lại.'));
    }
  };

  const insertPreset = (preset: string) => {
    setText((current) => (current.trim() ? `${current.trim()}. ${preset}` : preset).slice(0, max));
    textRef.current?.focus();
  };

  const reasonHint = reason?.required ? `Bắt buộc, từ ${min} đến ${max} ký tự.` : `Không bắt buộc, tối đa ${max} ký tự.`;
  const showLengthError = reason && trimmed.length > 0 && !lengthOk;

  return (
    <Portal>
      <div className="hgbo-overlay hgbo-overlay--modal" aria-hidden="true" onClick={busy ? undefined : onClose} />
      <div
        ref={ref}
        className="hgbo-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <h2 className="hgbo-dialog__title" id={titleId}>{title}</h2>
        {description && <p className="hgbo-dialog__desc" id={descId}>{description}</p>}
        <div className="hgbo-dialog__body">
          {impact && <div className="hgbo-impact">{impact}</div>}
          {children}
          {reason && (
            <div className="hgbo-field">
              <label className="hgbo-field__label" htmlFor={reasonId}>
                {reason.label}
                {reason.required && (
                  <>
                    <span className="hgbo-req" aria-hidden="true">*</span>
                    <span className="hgbo-sr"> (bắt buộc)</span>
                  </>
                )}
              </label>
              {reason.presets && reason.presets.length > 0 && (
                <div className="hgbo-chips" aria-label="Lý do gợi ý">
                  {reason.presets.map((preset) => (
                    <button key={preset} type="button" className="hgbo-chip" disabled={busy} onClick={() => insertPreset(preset)}>
                      {preset}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={textRef}
                id={reasonId}
                className="hgbo-textarea"
                rows={4}
                value={text}
                maxLength={max}
                placeholder={reason.placeholder}
                disabled={busy}
                aria-invalid={showLengthError ? true : undefined}
                aria-describedby={`${reasonId}-hint`}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="hgbo-field__foot">
                <p className={showLengthError ? 'hgbo-field__error' : 'hgbo-field__hint'} id={`${reasonId}-hint`}>
                  {showLengthError ? `Lý do cần từ ${min} đến ${max} ký tự (không tính khoảng trắng đầu/cuối).` : reasonHint}
                </p>
                <span className="hgbo-counter">{trimmed.length}/{max}</span>
              </div>
            </div>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
        <div className="hgbo-dialog__foot">
          <BoButton variant="secondary" disabled={busy} onClick={onClose}>{cancelLabel}</BoButton>
          <BoButton variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={!valid} onClick={submit}>
            {confirmLabel}
          </BoButton>
        </div>
      </div>
    </Portal>
  );
};
