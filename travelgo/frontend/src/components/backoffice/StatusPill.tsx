import React from 'react';
import { AlertCircle } from 'lucide-react';
import { StatusDomain, StatusTone, statusMeta } from './statusLabels';

export interface StatusPillProps {
  status: string | null | undefined;
  domain?: StatusDomain;
  size?: 'sm' | 'md';
  /** Ghi đè nhãn (vd. "3 báo cáo"), vẫn giữ tone theo status hoặc `tone`. */
  label?: string;
  tone?: StatusTone;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, domain, size = 'md', label, tone, className = '' }) => {
  const meta = statusMeta(status, domain);
  const finalTone = tone || meta.tone;
  return (
    <span
      className={`hgbo-pill hgbo-pill--${finalTone} ${size === 'sm' ? 'hgbo-pill--sm' : ''} ${className}`.trim()}
      title={meta.known ? undefined : String(status ?? '')}
    >
      {meta.alert ? <AlertCircle aria-hidden="true" /> : <span className="hgbo-pill__dot" aria-hidden="true" />}
      {label || meta.label}
    </span>
  );
};
