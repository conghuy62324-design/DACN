import React from 'react';
import { StatusDomain, actionLabel, statusLabel } from './statusLabels';
import { fmtDateTime } from './format';

export interface AuditItem {
  action: string;
  actorName?: string | null;
  at: string | null | undefined;
  reason?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface AuditListProps {
  items: AuditItem[] | null | undefined;
  emptyText?: string;
  /** Domain để đổi mã trạng thái from/to sang nhãn. */
  domain?: StatusDomain;
}

/** Timeline lịch sử. Thiếu actorName thì bỏ phần "bởi", không ghi "Không rõ". */
export const AuditList: React.FC<AuditListProps> = ({ items, emptyText = 'Máy chủ chưa trả lịch sử cho mục này.', domain }) => {
  if (!items || !items.length) return <p className="hgbo-audit__empty">{emptyText}</p>;
  return (
    <ol className="hgbo-audit">
      {items.map((item, index) => {
        const meta = [item.actorName ? `bởi ${item.actorName}` : '', item.at ? fmtDateTime(item.at) : ''].filter(Boolean).join(' · ');
        return (
          <li key={`${item.action}-${item.at}-${index}`} className="hgbo-audit__item">
            <p className="hgbo-audit__action">
              {actionLabel(item.action)}
              {(item.from || item.to) && (
                <span className="hgbo-muted">
                  {' · '}
                  {item.from ? statusLabel(item.from, domain) : '—'}
                  {' → '}
                  {item.to ? statusLabel(item.to, domain) : '—'}
                </span>
              )}
            </p>
            {meta && <p className="hgbo-audit__meta">{meta}</p>}
            {item.reason && <p className="hgbo-audit__reason">{item.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
};
