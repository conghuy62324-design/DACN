import React from 'react';
import { BoButton } from './BoButton';

export interface StickySaveBarProps {
  dirty: boolean;
  busy?: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
  statusText?: React.ReactNode;
  /** Khóa nút lưu (vd. form chưa hợp lệ). */
  saveDisabled?: boolean;
  extraActions?: React.ReactNode;
}

export const StickySaveBar: React.FC<StickySaveBarProps> = ({ dirty, busy, onSave, onReset, saveLabel = 'Lưu thay đổi', statusText, saveDisabled, extraActions }) => (
  <div className="hgbo-savebar" role="region" aria-label="Thanh lưu thay đổi">
    <span className={`hgbo-savebar__status ${dirty ? 'is-dirty' : ''}`.trim()} aria-live="polite">
      {statusText || (dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ')}
    </span>
    <div className="hgbo-savebar__actions">
      {extraActions}
      <BoButton variant="secondary" disabled={!dirty || busy} onClick={onReset}>Hủy thay đổi</BoButton>
      <BoButton variant="primary" loading={busy} disabled={!dirty || saveDisabled} onClick={onSave}>{saveLabel}</BoButton>
    </div>
  </div>
);
