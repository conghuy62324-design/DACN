import React, { useEffect, useRef } from 'react';
import type { AgentPrivacy } from '../../types/agent';

export function PrivacyConsentModal({ notice, agree, decline }: { notice: AgentPrivacy; agree: () => void; decline: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} aria-labelledby="agent-privacy-title" onCancel={e => { e.preventDefault(); decline(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
    <h2 id="agent-privacy-title" className="text-xl font-bold text-slate-900">Quyền riêng tư hội thoại</h2>
    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{notice.text}</p>
    <p className="mt-3 text-xs text-slate-500">Sự đồng ý chỉ áp dụng cho yêu cầu đang chờ, không áp dụng tự động cho lượt sau.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button autoFocus type="button" onClick={decline} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold">Từ chối</button>
      <button type="button" onClick={agree} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white">Đồng ý và gửi yêu cầu</button>
    </div>
  </dialog>;
}
