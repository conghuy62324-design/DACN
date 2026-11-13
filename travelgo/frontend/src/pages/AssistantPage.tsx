import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Plus, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AgentService } from '../services/agentService';
import { AgentConversation } from '../utils/agentConversation';
import { AgentG2Conversation } from '../utils/agentG2Conversation';
import { agentSessions } from '../utils/agentSessionLifecycle';
import { agentErrorMessage } from '../utils/agentContract';
import { AgentResultCard } from '../components/agent/AgentResultCard';
import { PrivacyConsentModal } from '../components/agent/PrivacyConsentModal';
import { AgentCorePanel } from '../components/agent/AgentCorePanel';

function AssistantSession({ token, owner }: { token: string; owner: string }) {
  const active = useRef(true);
  const [mode, setMode] = useState<'G1' | 'G2' | 'CORE'>('G1');
  const [client] = useState(() => AgentService.forSession(token));
  const isCurrent = () => active.current && localStorage.getItem('travelgo_token') === token;
  const [g1] = useState(() => new AgentConversation(client, isCurrent));
  const [g2] = useState(() => new AgentG2Conversation(client, isCurrent, {
    markContext: () => agentSessions.mark(owner), confirmedAll: () => agentSessions.confirmedAll(owner),
  }));
  const g1State = useSyncExternalStore(g1.subscribe, g1.getSnapshot);
  const g2State = useSyncExternalStore(g2.subscribe, g2.getSnapshot);
  const chat = mode === 'G2' ? g2 : g1, state = mode === 'G2' ? g2State : g1State;
  const [priorContext, setPriorContext] = useState(() => agentSessions.mayHaveContext(owner));
  const panel = useRef<HTMLDivElement>(null), nearBottom = useRef(true);
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    active.current = true;
    const unregister = agentSessions.register(token, () => { active.current = false; g1.reset(); g2.fence(); });
    const timer = setInterval(g2.checkExpiry, 1000);
    return () => { active.current = false; unregister(); clearInterval(timer); g1.cancel(); g2.fence(); };
  }, [g1, g2, token]);
  useLayoutEffect(() => {
    const el = panel.current;
    if (el && nearBottom.current) { el.scrollTop = el.scrollHeight; setUnseen(false); }
    else if (el) setUnseen(true);
  }, [state.turns, state.busy]);
  const send = () => { nearBottom.current = true; chat.send(); };
  if(mode==='CORE')return <AgentCorePanel token={token} onBack={()=>setMode('G1')}/>;
  return <div className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6">
    <div className="mx-auto max-w-4xl min-w-0">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700"><MessageCircle size={18} /> HuGo Travel</div>
          <h1 className="text-3xl font-extrabold text-slate-900">Trợ lý AI</h1>
          <p className="mt-2 text-sm text-slate-600">Cùng bạn tìm địa điểm và phác thảo hành trình.</p></div>
        <button type="button" onClick={() => { void chat.reset(); nearBottom.current = true; }} disabled={mode === 'G2' && g2State.phase === 'ended'} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"><Plus size={18} />{mode === 'G2' ? 'Đặt lại phiên G2' : 'Cuộc trò chuyện mới'}</button>
      </header>
      <p className="mb-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Hội thoại chỉ giữ trong phiên trang này. Tải lại trang, đăng xuất hoặc đổi tài khoản sẽ bắt đầu hội thoại mới.</p>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="font-semibold">Chế độ hiện tại: {mode === 'G1' ? 'G1 · không lưu ngữ cảnh máy chủ' : 'G2 · hội thoại local/demo'}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {mode === 'G1' ? <button type="button" disabled={state.busy || g2State.checking} onClick={() => void g2.requestOptIn()} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">{g2State.checking ? 'Đang kiểm tra G2…' : 'Dùng G2 local/demo'}</button> : <>
            <button type="button" disabled={g2State.busy && g2State.phase === 'ended'} onClick={() => void g2.end()} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Kết thúc phiên G2</button>
            <button type="button" disabled={g2State.busy} onClick={async () => { await g2.end(true); if (isCurrent()) { setMode('G1'); g1.reset(); } }} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Trở về G1</button>
            {['expired', 'unavailable', 'ended', 'uncertain', 'conflict'].includes(g2State.phase) && <button type="button" disabled={g2State.busy || g2State.checking} onClick={async () => { await g2.end(true); if (isCurrent()) await g2.requestOptIn(); }} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Bắt đầu phiên G2 mới</button>}
          </>}
          <Link to="/tour-planner" className="px-1 py-2 font-semibold text-sky-800 underline">Dùng Planner</Link>
          <button type="button" disabled={state.busy} onClick={async()=>{if(mode==='G2')await g2.end(true);if(isCurrent())setMode('CORE');}} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Catalog và Trip · Core</button>
          <Link to="/google-explore" className="px-1 py-2 font-semibold text-sky-800 underline">Địa điểm và đường đi Google</Link>
          <Link to="/assistant-public" className="px-1 py-2 font-semibold text-sky-800 underline">Trợ lý public · Gemini</Link>
        </div>
        {mode === 'G2' && <p className="mt-3 text-xs leading-5 text-slate-600">Thông tin xác minh chỉ lưu trong RAM máy chủ, tối đa 15 phút; có thể mất khi máy chủ khởi động lại. Tải lại trang về G1, không khôi phục phiên cũ. Đăng xuất thử xóa phiên, không bảo đảm xóa khi mất mạng.</p>}
        {g2State.message && <p role="status" className="mt-3 text-sm text-slate-700">{g2State.message}</p>}
        {g2State.noticeError && <p role="alert" className="mt-3 text-sm text-amber-900">{agentErrorMessage(g2State.noticeError)}</p>}
        {mode === 'G1' && priorContext && <div className="mt-3 text-xs leading-5 text-slate-600"><p>Trang đã bỏ hội thoại cũ. Máy chủ có thể còn dữ liệu tạm đến hết thời hạn 15 phút; trang không khôi phục ngữ cảnh đó.</p><button type="button" disabled={g2State.busy} className="mt-2 font-semibold underline" onClick={async () => { await g2.end(true); if (isCurrent()) setPriorContext(agentSessions.mayHaveContext(owner)); }}>Thử xóa các phiên G2 trước</button></div>}
      </div>
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
              <p className="whitespace-pre-wrap text-sm leading-6">{mode === 'G2' && turn.response.status === 'needs_input' && turn.response.missingFields.includes('transportation') ? 'Agent đang yêu cầu bạn xác nhận lại phương tiện.' : turn.response.reply}</p>
              {mode === 'G2' && turn.response.status === 'needs_input' && turn.response.missingFields.includes('transportation') && index === state.turns.length - 1 && <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" disabled={!g2.canSend()} onClick={() => g2.confirmTransportation('motorbike')} className="rounded-lg border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-900 disabled:opacity-50">Xe máy</button>
                <button type="button" disabled={!g2.canSend()} onClick={() => g2.confirmTransportation('car')} className="rounded-lg border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-900 disabled:opacity-50">Ô tô</button>
                <p className="w-full text-xs leading-5 text-slate-600">Bạn có thể sửa bằng tin nhắn, đổi lựa chọn, đặt lại hoặc kết thúc phiên. Xác nhận không bảo đảm Agent luôn hiểu đúng.</p>
              </div>}
              {turn.response.status === 'completed' && <AgentResultCard result={turn.response.result} />}
              {turn.response.status === 'tool_unavailable' && <Link to="/tour-planner" className="mt-3 inline-block text-sm font-semibold text-sky-800 underline">Mở Planner</Link>}
              {turn.response.historyTruncated && <p className="mt-3 text-xs text-slate-500">Một phần lịch sử cũ đã được bỏ khỏi ngữ cảnh gửi tiếp. Hãy nhắc lại thông tin còn cần.</p>}
            </article>}
            {turn.error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>{agentErrorMessage(turn.error)}</p><div className="mt-3 flex flex-wrap gap-4">
                {index === state.turns.length - 1 && <button disabled={state.busy || mode === 'G2' && !g2.canRetry()} type="button" onClick={() => chat.retry(turn.id)} className="font-bold underline disabled:opacity-50">Thử lại yêu cầu</button>}
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
          {mode === 'G1' && g1State.declined && <p role="status" className="mt-2 text-sm text-slate-600">Bạn đã từ chối gửi hội thoại ra bên ngoài. Nội dung nháp vẫn được giữ. <Link to="/tour-planner" className="font-semibold text-sky-800 underline">Mở Planner</Link></p>}
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{state.draft.length}/2000 · Shift+Enter xuống dòng</p>
            <button type="submit" disabled={state.busy || !state.draft.trim() || mode === 'G2' && !g2.canSend()} className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Send size={16} />{state.busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>
        </form>
      </section>
    </div>
    {mode === 'G1' && g1State.notice && <PrivacyConsentModal notice={g1State.notice} agree={g1.agree} decline={g1.decline} />}
    {g2State.notice && <PrivacyConsentModal retention notice={g2State.notice} agree={() => { if (g2.agree()) { g1.reset(); setPriorContext(false); setMode('G2'); } }} decline={g2.decline} />}
  </div>;
}

export function AssistantPage() {
  const { user, sessionGeneration } = useAuth();
  const token = localStorage.getItem('travelgo_token');
  // Keyed session drops old render state immediately, before effects or late responses.
  const debug = import.meta.env.DEV && import.meta.env.VITE_AGENT_DEBUG_CONTROLS === 'true' && new URLSearchParams(window.location.search).get('debug') === 'legacy';
  return user && token ? debug ? <AssistantSession key={`${user.id}:${token}:${sessionGeneration}`} token={token} owner={user.id} /> : <AgentCorePanel key={`${user.id}:${token}:${sessionGeneration}`} token={token} customer authenticatedName={user.fullName}/> : null;
}
