import React from 'react';
import { Link } from 'react-router-dom';
import type { AgentResult } from '../../types/agent';

const money = (value: number) => Number.isFinite(value) ? `${new Intl.NumberFormat('vi-VN').format(value)} ₫` : 'Chưa có dự toán';
const text = (value: unknown) => typeof value === 'string' ? value : '';
// Presentation only: retain every price/assumption; hide internal field and benchmark names from customers.
const customerText=(value:string)=>value.replace(/priceFrom/g,'giá tham khảo').replace(/\bactivity\b/g,'hoạt động').replace(/planner T11-B trong source/g,'lập kế hoạch của TravelGo').replace(/planner T11-B/g,'lập kế hoạch của TravelGo').replace(/N−1/g,'số ngày trừ1').replace(/ETA là Haversine, không phải road routing/g,'thời gian di chuyển chỉ ước tính theo khoảng cách đường chim bay, chưa tính theo đường đi thực tế');
const Warnings = ({ values }: { values: string[] }) => values.length ? <aside aria-label="Cảnh báo" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
  <h3 className="font-bold">Lưu ý cho chuyến đi</h3><ul className="mt-2 list-disc space-y-1 pl-5">{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
</aside> : null;

export function AgentResultCard({ result,customer=false }: { result: AgentResult;customer?:boolean }) {
  const display=(value:string)=>customer?customerText(value):value;
  if (result.type === 'places') return <section aria-label="Kết quả địa điểm" className="mt-4 space-y-3">
    <h3 className="font-bold">Địa điểm từ Catalog</h3>
    {!result.places.length && <p>Chưa tìm thấy địa điểm phù hợp.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{result.places.map(p => <article key={p.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <Link className="font-semibold text-sky-800 underline" to={`/places/${encodeURIComponent(p.id)}`}>{p.name}</Link>
      <p className="mt-1 text-sm text-slate-600">{text(p.city)}{p.province && p.province !== p.city ? ` · ${text(p.province)}` : ''}</p>
      <p className="mt-3 font-semibold">{p.catalogPriceAvailable && p.priceFrom !== null ? `Giá từ ${money(p.priceFrom)}` : 'Chưa có giá trong Catalog'}</p>
    </article>)}</div><Warnings values={result.warnings.map(display)} />
  </section>;
  const { itinerary: p, cost } = result;
  return <section aria-label="Lịch trình đề xuất" className="mt-4 space-y-4">
    <header><h3 className="text-lg font-bold">{p.title}</h3><p className="text-sm text-slate-600">{p.destinationCity} · {p.startDate} – {p.endDate}</p></header>
    <section aria-label="Chi phí lịch trình" className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-semibold text-sky-900">Dự toán cho cả nhóm · {customer?'VND':cost.basis}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{money(cost.estimated)}</p>
      <p className="mt-2 text-sm">Ngân sách: {money(cost.budget)}</p>
      <p className="mt-1 font-semibold">{cost.budgetStatus === 'over_budget' ? `Vượt ngân sách: ${money(cost.overBudget)}` : 'Trong ngân sách đã nhập'}</p>
      <p className="mt-2 text-sm">{p.budgetAdvice}</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Giả định chi phí</summary><ul className="mt-2 list-disc space-y-1 pl-5">{p.costAssumptions?.map((a, i) => <li key={i}>{display(a)}</li>)}</ul></details>
    </section>
    {p.days.map((day, i) => <section key={day.date + i} className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="font-bold">Ngày {i + 1} · {day.date}</h4><p className="text-sm text-slate-600">{day.themeTitle}</p>
      <ol className="mt-3 space-y-3">{day.activities.map((a, index) => <li key={a.id || index} className="border-l-2 border-orange-300 pl-3">
        <p className="font-semibold">{a.title}</p><p className="mt-1 text-sm text-slate-600">{a.description}</p>
        <p className="mt-1 text-sm">Dự toán: {money(a.estimatedCostVND)}</p>{a.costSource && <p className="text-xs text-slate-500">{display(text(a.costSource))}</p>}
      </li>)}</ol>
      <p className="mt-4 text-sm font-semibold">Dự toán ngày: {money(day.dayEstimatedCostVND)}</p>
      {typeof day.lodgingEstimatedCostVND === 'number' && <p className="text-sm text-slate-600">Chi phí lưu trú: {money(day.lodgingEstimatedCostVND)}</p>}
    </section>)}
    {p.hotelSuggestion && <p className="text-sm">Gợi ý lưu trú: <Link className="text-sky-800 underline" to={`/places/${encodeURIComponent(p.hotelSuggestion.id)}`}>{p.hotelSuggestion.name}</Link></p>}
    {!!p.constraintViolations?.length && <p className="text-sm font-semibold text-amber-800">Ràng buộc chưa đáp ứng: {p.constraintViolations.join(', ')}</p>}
    <Warnings values={result.warnings.map(display)} />
    <p className="text-xs text-slate-500">Bản tham khảo từ {customer?'bộ lập lịch trình TravelGo':'Planner'}. Chưa lưu chuyến đi hoặc đặt dịch vụ.</p>
  </section>;
}
