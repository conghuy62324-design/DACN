import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Plus, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AgentService } from '../services/agentService';
import { AgentConversation } from '../utils/agentConversation';
import { agentErrorMessage } from '../utils/agentContract';
import { AgentResultCard } from '../components/agent/AgentResultCard';
import { PrivacyConsentModal } from '../components/agent/PrivacyConsentModal';

function AssistantSession({ token }: { token: string }) {
  const [chat] = useState(() => new AgentConversation(AgentService, () => localStorage.getItem('travelgo_token') === token));
  const state = useSyncExternalStore(chat.subscribe, chat.getSnapshot);
  const panel = useRef<HTMLDivElement>(null), nearBottom = useRef(true);
  const [unseen, setUnseen] = useState(false);
  useEffect(() => () => chat.cancel(), [chat]);
  useLayoutEffect(() => {
    const el = panel.current;
    if (el && nearBottom.current) { el.scrollTop = el.scrollHeight; setUnseen(false); }
    else if (el) setUnseen(true);
  }, [state.turns, state.busy]);
  const send = () => { nearBottom.current = true; chat.send(); };
  return <div className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6">
    <div className="mx-auto max-w-4xl min-w-0">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700"><MessageCircle size={18} /> HuGo Travel</div>
          <h1 className="text-3xl font-extrabold text-slate-900">Trợ lý AI</h1>
          <p className="mt-2 text-sm text-slate-600">Cùng bạn tìm địa điểm và phác thảo hành trình.</p></div>
        <button type="button" onClick={() => { chat.reset(); nearBottom.current = true; }} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"><Plus size={18} /> Cuộc trò chuyện mới</button>
      </header>
      <p className="mb-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Hội thoại chỉ giữ trong phiên trang này. Tải lại trang, đăng xuất hoặc đổi tài khoản sẽ bắt đầu hội thoại mới.</p>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div ref={panel} role="region" aria-label="Hội thoại" tabIndex={0} onScroll={() => {
          const el = panel.current!; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (nearBottom.current) setUnseen(false);
        }} className="h-[52dvh] min-h-[280px] max-h-[620px] overflow-y-auto p-4 sm:p-6 [overflow-wrap:anywhere]">
          {!state.turns.length && <div className="mx-auto grid max-w-lg justify-items-center gap-4 py-10 text-center">
            <div className="rounded-2xl bg-orange-50 p-4 text-orange-600"><MessageCircle size={28} /></div>
            <h2 className="text-xl font-bold text-slate-900">Bạn muốn khám phá đâu?</h2>
            <p className="text-sm leading-6 text-slate-600">Hãy cho biết nơi xuất phát, điểm đến, ngày đi, số người, ngân sách và phương tiện. Trợ lý sẽ hỏi thêm nếu cần.</p>
            <Link to="/tour-planner" className="text-sm font-semibold text-sky-800 underline">Hoặc tự tạo lịch trình với Planner</Link>
          </div>}
          <div className="space-y-6">{state.turns.map((turn, index) => <div key={turn.id} data-testid="agent-turn" className="space-y-3">
            <article aria-label="Tin nhắn của bạn" className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-orange-50 p-4 text-slate-900">
              <p className="mb-1 text-xs font-bold text-orange-800">Bạn</p><p className="whitespace-pre-wrap text-sm leading-6">{turn.question}</p>
            </article>
            {turn.response && <article aria-label="Phản hồi Agent" className="rounded-2xl rounded-tl-sm bg-slate-50 p-4 text-slate-800">
              <p className="mb-2 text-xs font-bold text-sky-800">HuGo Assistant</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{turn.response.reply}</p>
              {turn.response.status === 'completed' && <AgentResultCard result={turn.response.result} />}
              {turn.response.status === 'tool_unavailable' && <Link to="/tour-planner" className="mt-3 inline-block text-sm font-semibold text-sky-800 underline">Mở Planner</Link>}
              {turn.response.historyTruncated && <p className="mt-3 text-xs text-slate-500">Một phần lịch sử cũ đã được bỏ khỏi ngữ cảnh gửi tiếp. Hãy nhắc lại thông tin còn cần.</p>}
            </article>}
            {turn.error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>{agentErrorMessage(turn.error)}</p><div className="mt-3 flex flex-wrap gap-4">
                {index === state.turns.length - 1 && <button disabled={state.busy} type="button" onClick={() => chat.retry(turn.id)} className="font-bold underline disabled:opacity-50">Thử lại yêu cầu</button>}
                <Link className="font-semibold underline" to="/tour-planner">Dùng Planner thông thường</Link>
              </div>
            </div>}
          </div>)}</div>
          {state.busy && <p role="status" className="mt-5 text-sm font-semibold text-sky-700">Trợ lý đang xử lý yêu cầu…</p>}
        </div>
        {unseen && <button className="w-full bg-sky-50 py-2 text-sm font-semibold text-sky-800" onClick={() => { const el = panel.current!; el.scrollTop = el.scrollHeight; nearBottom.current = true; setUnseen(false); }}>Xem tin nhắn mới</button>}
        <form className="border-t border-slate-200 p-4 sm:p-6" onSubmit={e => { e.preventDefault(); send(); }}>
          <label htmlFor="agent-message" className="mb-2 block text-sm font-semibold text-slate-800">Yêu cầu du lịch của bạn</label>
          <textarea id="agent-message" rows={3} maxLength={2000} value={state.draft} disabled={state.busy} onChange={e => chat.setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder="Nhập yêu cầu bằng tiếng Việt…" className="w-full resize-y rounded-xl border border-slate-300 p-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50" />
          {state.declined && <p role="status" className="mt-2 text-sm text-slate-600">Bạn đã từ chối gửi hội thoại ra bên ngoài. Nội dung nháp vẫn được giữ. <Link to="/tour-planner" className="font-semibold text-sky-800 underline">Mở Planner</Link></p>}
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{state.draft.length}/2000 · Shift+Enter xuống dòng</p>
            <button type="submit" disabled={state.busy || !state.draft.trim()} className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Send size={16} />{state.busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>
        </form>
      </section>
    </div>
    {state.notice && <PrivacyConsentModal notice={state.notice} agree={chat.agree} decline={chat.decline} />}
  </div>;
}

export function AssistantPage() {
  const { user } = useAuth();
  const token = localStorage.getItem('travelgo_token');
  // Keyed session drops old render state immediately, before effects or late responses.
  return user && token ? <AssistantSession key={`${user.id}:${token}`} token={token} /> : null;
}
