import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTelemetry } from '../../context/TelemetryContext';

export const TelemetryConsent: React.FC = () => {
  const { user } = useAuth();
  const { consent, loading, updateConsent } = useTelemetry();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!user || loading) return null;
  const visible = open || !consent.hasDecision;

  const save = async (analytics: boolean, personalization: boolean) => {
    setSaving(true);
    try {
      await updateConsent(analytics, personalization, !analytics && consent.hasDecision);
      setOpen(false);
    } finally { setSaving(false); }
  };

  if (!visible) return (
    <button data-testid="telemetry-settings" onClick={() => setOpen(true)} className="fixed bottom-4 left-4 z-40 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-md hover:bg-slate-50">
      Quyền riêng tư AI
    </button>
  );

  return (
    <section data-testid="telemetry-consent" aria-label="Quyền riêng tư HuGo Intelligence" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-6 w-6 flex-none text-emerald-600" />
        <div className="flex-1">
          <h2 className="font-bold text-slate-900">Bạn kiểm soát dữ liệu HuGo Intelligence</h2>
          <p className="mt-1 text-sm text-slate-600">HuGo chỉ ghi tương tác với nội dung sau khi bạn đồng ý. Không gửi email, JWT hay GPS thô. Event được giữ tối đa {consent.retentionDays} ngày.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button data-testid="telemetry-accept-personalization" disabled={saving} onClick={() => save(true, true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Đồng ý cá nhân hóa</button>
            <button data-testid="telemetry-analytics-only" disabled={saving} onClick={() => save(true, false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Chỉ analytics</button>
            <button data-testid="telemetry-decline" disabled={saving} onClick={() => save(false, false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 disabled:opacity-50">Từ chối / xóa event của tôi</button>
          </div>
        </div>
      </div>
    </section>
  );
};
