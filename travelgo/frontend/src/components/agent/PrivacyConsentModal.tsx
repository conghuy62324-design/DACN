import React, { useEffect, useRef } from 'react';
import type { AgentPrivacy } from '../../types/agent';

export function PrivacyConsentModal({ notice, agree, decline, retention = false }: { notice: AgentPrivacy; agree: () => void; decline: () => void; retention?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} aria-labelledby="agent-privacy-title" onCancel={e => { e.preventDefault(); decline(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
    <h2 id="agent-privacy-title" className="text-xl font-bold text-slate-900">Quyền riêng tư hội thoại</h2>
    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{notice.text}</p>
    {retention ? <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
      <p>G2 local/demo giữ thông tin đã xác minh trong RAM máy chủ tối đa 15 phút kể từ khi bắt đầu. Khởi động lại máy chủ có thể làm mất phiên. Tải lại trang không khôi phục phiên.</p>
      <p>Đây là xác nhận lưu tạm cho phiên G2, tách biệt với quyền xử lý AI bên ngoài và cá nhân hóa; không tự bật các quyền đó.</p>
      <p>Giao diện này sẽ thử xóa các phiên G2 khi đăng xuất hoặc đổi tài khoản. Nếu mạng lỗi, dữ liệu tạm có thể còn đến hết thời hạn; đăng xuất không vô hiệu hóa mọi token đã cấp.</p>
    </div> : <p className="mt-3 text-xs text-slate-500">Sự đồng ý chỉ áp dụng cho yêu cầu đang chờ, không áp dụng tự động cho lượt sau.</p>}
    <div className="mt-6 flex flex-wrap gap-3">
      <button autoFocus type="button" onClick={decline} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold">Từ chối</button>
      <button type="button" onClick={agree} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white">{retention ? 'Đồng ý dùng G2 local/demo' : 'Đồng ý và gửi yêu cầu'}</button>
    </div>
  </dialog>;
}
