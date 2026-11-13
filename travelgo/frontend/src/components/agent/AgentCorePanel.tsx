import {LocationCombobox} from '../common/LocationCombobox';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { agentCoreClient, NATURAL_CHAT_V3, CORE_INTENT_V2, CORE_CLARIFICATION_ACTIONS, CORE_CONSENT, coreMetadata, readCoreResponse, type CoreMetadata } from '../../services/agentCoreClient';
import { authenticatedGreeting, naturalChatError } from '../../utils/naturalChatPresentation';
import { PlaceService } from '../../services/placeService';
import { AgentResultCard } from './AgentResultCard';
import { useBooking } from '../../context/BookingContext';
const money = (v: any) => v === null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN').format(v) + ' ₫';
export function AgentCorePanel({ token, onBack, customer = false, authenticatedName }: {
    token: string;
    onBack?: () => void;
    customer?: boolean;
    authenticatedName?: string;
}) {
    const client = useRef(agentCoreClient(token,customer?NATURAL_CHAT_V3:CORE_INTENT_V2)).current, active = useRef(true), pending = useRef(false), abort = useRef<AbortController>(), metadata = useRef<CoreMetadata>();
    const [greeting]=useState(()=>authenticatedGreeting(authenticatedName));
    const [incomingListing,setIncomingListing]=useState<any>();
    const chatPanel=useRef<HTMLDivElement>(null),nearBottom=useRef(true);
    const [notice, setNotice] = useState<any>(), [agreed, setAgreed] = useState(false), [draft, setDraft] = useState(''), [turns, setTurns] = useState<any[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false), [clock, setClock] = useState(Date.now()), [meta, setMeta] = useState<CoreMetadata>(), [city, setCity] = useState(''), [cap, setCap] = useState(''), [amenities, setAmenities] = useState(''), [preferences, setPreferences] = useState(''), [ids, setIds] = useState<string[]>([]), [tripId, setTripId] = useState(''), [useTrip, setUseTrip] = useState(false), [ticket, setTicket] = useState<any>(), [confirmChecked, setConfirmChecked] = useState(false), [savedId, setSavedId] = useState('');
    const clarification = (data: any) => {
        const action = data.clarification && CORE_CLARIFICATION_ACTIONS[data.clarification.suggestedOperation as keyof typeof CORE_CLARIFICATION_ACTIONS];
        return action && <button disabled={busy || expired || blocked || !agreed} onClick={() => void send(action.message)} className="rounded border px-3 py-2">Xác nhận tác vụ: {action.label}</button>;
    };
    const { openBooking } = useBooking();
    const current = () => active.current && localStorage.getItem('travelgo_token') === token;
    const apply = (m: CoreMetadata) => { metadata.current = m; setMeta(m); };
    const expired = !!meta && Date.parse(meta.expiresAt) <= clock;
    useEffect(()=>{const id=new URLSearchParams(window.location.search).get('listing');if(customer&&id&&/^[0-9a-f-]{36}$/i.test(id))void PlaceService.getPlaceById(id).then(p=>{if(current())setIncomingListing(p);}).catch(()=>{if(current())setError('Dịch vụ vừa chọn không còn hiển thị. Bạn tìm lại trong catalog nhé.');});},[customer,token]);
    useEffect(()=>{if(customer&&chatPanel.current&&nearBottom.current)chatPanel.current.scrollTop=chatPanel.current.scrollHeight;},[turns,busy,customer]);
    useEffect(() => { active.current = true; const c = new AbortController(); client.privacy(c.signal).then(v => { if (current())
        setNotice(v); }).catch(() => { if (current())
        if(!c.signal.aborted)setError(customer?'Chưa tải được thông tin quyền riêng tư. Bạn thử tải lại trang nhé.':'Chưa lấy được thông báo Core.'); }); const timer = setInterval(() => setClock(Date.now()), 1000); return () => { active.current = false; c.abort(); abort.current?.abort(); clearInterval(timer); if (metadata.current)
        void client.revoke().catch(() => { }); }; }, [client]);
    const end = async () => { abort.current?.abort(); setBlocked(true); setTurns([]); setIncomingListing(undefined); setTicket(undefined); setDraft('');setCity('');setCap('');setAmenities('');setPreferences('');setTripId('');setUseTrip(false);setError('');setConfirmChecked(false); metadata.current = undefined; setMeta(undefined); try {
        await client.revoke();
        if (current()) {
            setBlocked(false);
            setAgreed(false);
            setIds([]);
            setSavedId('');
        }
    }
    catch {
        if (current())
            setError('Chưa xác nhận xóa phiên; RAM tự hết hạn sau tối đa 15 phút.');
    } };
    const send = async (message = draft, extra: any = {}) => {
        if (pending.current || !current() || !message.trim() || !agreed || blocked || expired)
            return;
        pending.current = true;
        setBusy(true);
        setError('');
        setTicket(undefined);
        setConfirmChecked(false);
        const c = new AbortController();
        abort.current = c;
        const prior = metadata.current, req = prior ? { action: 'continue', id: prior.id, revision: prior.revision, requestId: crypto.randomUUID(), consentVersion: CORE_CONSENT } : { action: 'start', requestId: crypto.randomUUID(), consentVersion: CORE_CONSENT };
        try {
            const filters = { ...(city.trim() ? (/^\d{2}$|^destination:|^area:|^all$/.test(city)?{locationId:city}:{city:city.trim()}) : {}), ...(cap !== '' ? { maxPriceFrom: Number(cap) } : {}), ...(amenities.trim() ? { amenities: amenities.split(',').map(x => x.trim()).filter(Boolean) } : {}), ...(preferences.trim() ? { preferences: preferences.split(',').map(x => x.trim()).filter(Boolean) } : {}) };
            const r = await client.chat({ message, conversation: req, consentVersion: CORE_CONSENT, ...(Object.keys(filters).length ? { filters } : {}), ...(ids.length ? { selectedIds: ids } : {}), ...(tripId ? { tripId, useTripContext: useTrip } : {}), ...extra }, c.signal);
            if (!current() || c.signal.aborted)
                return;
            const d = readCoreResponse(r, req, prior);
            apply(d.conversation);
            setTurns(v => [...v.slice(-15), { message, data: d }]);
            setDraft('');
            if (d.confirmation)
                setTicket(d.confirmation);
        }
        catch (e: any) {
            if (!current() || c.signal.aborted)
                return;
            try {
                if (e.conversation)
                    apply(coreMetadata(e.conversation, req, prior));
                else
                    setBlocked(true);
            }
            catch {
                setBlocked(true);
            }
            setError(customer?naturalChatError(e):e.message || 'Không xử lý được yêu cầu. Không tự gửi lại.');
        }
        finally {
            pending.current = false;
            if (current())
                setBusy(false);
        }
    };
    const confirm = async () => { if (!ticket || !meta || !confirmChecked || pending.current || !current() || expired)
        return; const t = ticket; setTicket(undefined); pending.current = true; setBusy(true); setError(''); const c = new AbortController(); abort.current = c; try {
        const r: any = await client.confirm({ conversationId: meta.id, revision: meta.revision, ticketId: t.id, payloadHash: t.payloadHash, confirmed: true }, c.signal);
        if (current() && !c.signal.aborted) {
            if (r?.success !== true || r.data?.status !== 'saved' || typeof r.data.trip?.id !== 'string')
                throw Error();
            setSavedId(r.data.trip.id);
        }
    }
    catch (e: any) {
        if (current())
            setError((e.message || 'Chưa xác minh kết quả ghi.') + ' Không gửi lại tự động. Kiểm tra Chuyến đi của tôi trước khi tạo bản xem trước mới.');
    }
    finally {
        pending.current = false;
        if (current())
            setBusy(false);
    } };
    const choose = (p: any) => void send(p.category === 'hotel' ? 'Chọn khách sạn này' : 'Chọn nhà hàng này', { selection: { kind: p.category, id: p.id } });
    const toggle = (id: string) => setIds(v => v.includes(id) ? v.filter(x => x !== id) : v.length < 5 ? [...v, id] : v);
    const cards = (items: any[]) => <div className="grid gap-3 sm:grid-cols-2">{items.map(p => <article key={p.id} className="min-w-0 space-y-2 rounded-xl border bg-white p-3">{p.heroImage && <img src={p.heroImage} alt={p.name} loading="lazy" className="h-32 w-full rounded object-cover"/>}<h3 className="font-bold">{p.name}</h3><p>{p.city} · {p.province}</p><p className="font-semibold">Giá từ: {money(p.priceFrom)}</p><p className="text-xs">{p.isDemo && "DEMO: giá giả định, không phải Booking thật. "}Đơn vị giá chưa xác minh; chưa xác nhận còn phòng/bàn.</p><p className="text-sm">{p.reviewCount > 0 ? `${p.rating} / 5 · ${p.reviewCount} đánh giá` : 'Chưa có đánh giá'}</p>{p.amenities?.length > 0 && <p className="text-sm">Tiện ích: {p.amenities.join(', ')}</p>}<ul className="text-xs">{(p.reasons || []).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul><label className="flex gap-2 text-sm"><input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)}/>Chọn để xem/so sánh</label><div className="flex flex-wrap gap-3 text-sm"><Link to={p.href || '/places/' + p.id} className="underline">Xem trang dịch vụ</Link><button disabled={busy} onClick={() => void send('Xem chi tiết', { selectedIds: [p.id] })} className="underline">Chi tiết trong chat</button>{['hotel', 'restaurant'].includes(p.category) && <button disabled={busy} onClick={() => choose(p)} className="underline">Dùng {p.category === 'hotel' ? 'khách sạn' : 'nhà hàng'} này</button>}<button disabled={busy} onClick={() => void send('Chuẩn bị Booking', { selectedIds: [p.id] })} className="underline">Xem Booking</button></div></article>)}</div>;
    const result = (r: any) => { if (!r)
        return null; if (r.type === 'itinerary')
        return <AgentResultCard result={r} customer={customer}/>; if (r.type === 'registered_options')
        return <>{cards(r.items)}{r.warnings?.map((x: string, i: number) => <p key={i} className="text-xs text-slate-600">{x}</p>)}</>; if (r.type === 'comparison')
        return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Dịch vụ</th><th>Giá từ</th><th>Tiện ích</th><th>Đánh giá</th></tr></thead><tbody>{r.items.map((p: any) => <tr key={p.id}><td>{p.name}</td><td>{money(p.priceFrom)}</td><td>{p.amenities.join(', ')}</td><td>{p.reviewCount > 0 ? `${p.rating}/5 (${p.reviewCount})` : 'Chưa có'}</td></tr>)}</tbody></table><p>{r.warning}</p></div>; if (r.type === 'listing_details')
        return cards([r.listing]); if (r.type === 'trip')
        return <div><h3 className="font-bold">{r.trip.title}</h3><p>{r.trip.startDate} – {r.trip.endDate}</p><Link to={'/my-trips/' + encodeURIComponent(r.trip.id)} className="underline">Mở và chỉnh sửa Trip</Link></div>; if (r.type === 'booking_preview')
        return <div className="space-y-2"><h3 className="font-bold">Booking: {r.listing.name}</h3>{r.pricing && <><p>Đơn giá: {money(r.pricing.unitPrice)} · Số đơn vị: {r.pricing.quantity}</p><p>Giảm giá: {money(r.pricing.discountAmount)} · {customer?"Tổng dự tính":"Tổng dự tính từ Booking server"}: {money(r.pricing.totalAmount)}</p></>}<p>Chưa tạo Booking, chưa thanh toán hoặc xác nhận availability. Giá MVP tính theo khách, không phải phòng theo đêm.</p>{r.bookable && <button className="rounded border px-4 py-2" onClick={() => openBooking({ serviceType: r.listing.category, serviceId: r.listing.id, serviceName: r.listing.name, unitPrice: r.listing.priceFrom, imageUrl: r.listing.heroImage || undefined })}>Mở màn hình xác nhận Booking</button>}</div>; return null; };
    return <section className="mx-auto max-w-4xl space-y-5 px-4 pb-16 pt-28">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">{customer?'Trợ lý du lịch TravelGo':'Trợ lý AI · Catalog và Trip'}</h1><p className="mt-2 text-sm text-slate-600">Cùng bạn tìm nơi ở, chỗ ăn và lên kế hoạch chuyến đi.</p></div>{customer?<button onClick={()=>void end()} className="rounded-xl border bg-white px-4 py-3">Cuộc trò chuyện mới</button>:<button onClick={onBack} className="underline">Trở về hội thoại G1/G2</button>}</header>
 <div className="space-y-3 rounded-xl border bg-white p-4">{customer?<details><summary className="cursor-pointer text-sm">Cách trợ lý sử dụng thông tin</summary><p className="mt-2 text-sm">{notice?.text||'Đang lấy thông báo quyền riêng tư…'}</p></details>:<p className="text-sm">{notice?.text||'Đang lấy thông báo Core…'}</p>}
 <p className="text-xs text-slate-600">{notice?.modelConfigured?'AI ngôn ngữ được cấu hình. Yêu cầu chưa rõ sẽ được hỏi lại; kết quả dịch vụ lấy từ TravelGo.':customer?'AI hiểu ngôn ngữ tự nhiên hiện chưa được bật. Bạn vẫn có thể bổ sung thông tin và tra cứu các dịch vụ TravelGo bằng yêu cầu rõ ràng.':'Model chưa bật. Các thao tác rõ ràng chạy qua bộ điều phối Core đã xác minh, không là model LIVE PASS.'}</p>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={agreed} onChange={e=>{setAgreed(e.target.checked);if(!e.target.checked&&meta)void end();}}/>{customer?'Cho phép trợ lý nhớ thông tin chuyến đi trong phiên này (tối đa 15 phút).':'Đồng ý giữ slots và bản Planner tạm tối đa 15 phút.'}</label>{!customer&&<button onClick={()=>void end()} className="rounded border px-3 py-2">Kết thúc phiên Core</button>}
 </div>
 <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">{customer?"Tuỳ chọn lọc và chuyến đi đã lưu":"Bộ lọc catalog và Trip của tôi"}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><LocationCombobox label="Khu vực Agent" value={city} onChange={setCity}/><label>Giá từ tối đa (VND)<input aria-label={customer?"Giá từ tối đa":"Giá từ tối đa Core"} type="number" min="0" className="w-full rounded border p-2" value={cap} onChange={e => setCap(e.target.value)}/></label><label>Tiện ích bắt buộc, ngăn bởi dấu phẩy<input className="w-full rounded border p-2" value={amenities} onChange={e => setAmenities(e.target.value)}/></label><label>Sở thích ưu tiên<input className="w-full rounded border p-2" value={preferences} onChange={e => setPreferences(e.target.value)}/></label><label>Mã Trip của tôi (trống để lưu mới)<input aria-label={customer?"Mã chuyến đi":"Mã Trip Core"} className="w-full rounded border p-2" value={tripId} onChange={e => { setTripId(e.target.value); setTicket(undefined); }}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={useTrip} onChange={e => setUseTrip(e.target.checked)}/>Cho phép dùng thông tin chuyến đi đã lưu để tính lại trong phiên; không dùng ghi chú riêng tư hoặc thông tin tài khoản.</label></div></details>
 {!customer&&<div className="flex flex-wrap gap-2">{['Tìm khách sạn', 'Tìm nhà hàng', 'So sánh các lựa chọn này', 'Xem Trip của tôi', 'Lưu Trip'].map(m => <button key={m} onClick={() => void send(m)} disabled={busy || !agreed || expired || blocked} className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-40">{m}</button>)}</div>}
 {customer&&ids.length>=2&&<button disabled={busy||blocked||expired} onClick={()=>void send('So sánh các lựa chọn này')} className="rounded border p-3">So sánh các lựa chọn đã chọn</button>}
 {error && <p role="alert" className="rounded-xl border bg-amber-50 p-4 text-amber-950">{error}</p>}{(blocked || expired) && <p role="status">Phiên chưa tiếp tục được; kết thúc và đồng ý lại để tạo phiên mới.</p>}{savedId && <p role="status">Đã lưu Trip. <Link to={'/my-trips/' + encodeURIComponent(savedId)} className="underline">Mở Trip đã lưu</Link></p>}
 <div ref={chatPanel} role="log" aria-label={customer?'Hội thoại TravelGo':'Hội thoại Core'} aria-live="polite" onScroll={()=>{const p=chatPanel.current;if(p)nearBottom.current=p.scrollHeight-p.scrollTop-p.clientHeight<100;}} className={customer?'h-[58dvh] min-h-[300px] space-y-5 overflow-y-auto rounded-2xl border bg-slate-50 p-4 [overflow-wrap:anywhere]':'space-y-5'}>
 {customer&&<article data-testid="agent-greeting" className="rounded-2xl bg-white p-4 text-slate-800"><p className="mb-2 text-xs font-semibold text-sky-800">TravelGo</p><p>{greeting}</p></article>}
 {incomingListing&&<aside className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="font-semibold">Bạn vừa chọn: {incomingListing.name}</p><p className="text-sm">{incomingListing.isDemo?'DEMO, giá giả định; không phải dịch vụ Booking thật.':'Trợ lý sẽ kiểm tra lại thông tin hiện tại trước khi sử dụng.'}</p><button disabled={!agreed||busy||blocked||expired} className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50" onClick={()=>void send('Xem chi tiết',{selectedIds:[incomingListing.id]})}>Xem dịch vụ trong cuộc trò chuyện</button></aside>}
 {turns.map((t, i) => <article key={i} className="min-w-0 space-y-3 rounded-xl border bg-white p-4"><p className="whitespace-pre-wrap font-semibold">Bạn: {t.message}</p><p>{t.data.reply}</p>{t.data.languageWarning&&<p role="status" className="text-sm text-amber-800">{t.data.languageWarning}</p>}{result(t.data.result)}{i === turns.length - 1 && clarification(t.data)}{!customer&&t.data.missingFields?.includes('transportation') && i === turns.length - 1 && <div className="flex gap-3"><button disabled={busy} onClick={() => void send('Phương tiện: xe máy')} className="rounded border p-2">Xe máy</button><button disabled={busy} onClick={() => void send('Phương tiện: ô tô')} className="rounded border p-2">Ô tô</button></div>}</article>)}
 {busy&&<p role="status" className="text-sm text-sky-800">Trợ lý đang xử lý tin nhắn…</p>}</div>
 {ticket && <section aria-label={customer?"Xác nhận lưu chuyến đi":"Xác nhận lưu Trip Core"} className="space-y-3 rounded-xl border border-orange-300 bg-white p-4"><h2 className="font-bold">{ticket.operation === 'CREATE' ? 'Xem trước Trip mới' : 'Xem trước cập nhật Trip đã chọn'}</h2><p>{ticket.plan.title} · {ticket.plan.startDate} – {ticket.plan.endDate}</p><p>Dự toán: {money(ticket.plan.totalEstimatedCostVND)} · Ngân sách: {money(ticket.plan.totalBudgetUserVND)}</p><ol>{ticket.plan.days.map((d: any, i: number) => <li key={i}>Ngày {i + 1} ({d.date}): {d.activities.map((a: any) => a.title).join(' · ')} · {money(d.dayEstimatedCostVND)}</li>)}</ol><label className="flex gap-2"><input type="checkbox" checked={confirmChecked} onChange={e => setConfirmChecked(e.target.checked)}/>Tôi đã xem lịch trình/chi phí và đồng ý ghi Trip này.</label><button onClick={() => void confirm()} disabled={!confirmChecked || busy || expired || Date.parse(ticket.expiresAt) <= clock} className="rounded bg-orange-700 px-4 py-3 text-white disabled:opacity-50">{customer?"Xác nhận lưu chuyến đi":"Xác nhận lưu Trip Core"}</button></section>}
 <form onSubmit={e => { e.preventDefault(); void send(); }} className="space-y-3 rounded-xl border bg-white p-4"><label htmlFor="core-message" className="font-semibold">{customer?'Tin nhắn của bạn':'Yêu cầu Core'}</label><textarea id="core-message" rows={3} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e=>{if(customer&&e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}} className="w-full rounded border p-3" placeholder={customer?'Cứ nhắn tự nhiên, ví dụ: hcm đi đà nẵng, 2 lớn 1 bé, ngân sách 12tr…':'Tìm khách sạn ở Đà Nẵng; hoặc lập lịch trình với nơi đi/đến, ngày, số người, ngân sách và phương tiện…'}/><button disabled={busy || !agreed || !notice || !draft.trim() || blocked || expired} className="rounded bg-sky-700 px-4 py-3 text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : customer?'Gửi':'Gửi yêu cầu Core'}</button></form>
 </section>;
}
