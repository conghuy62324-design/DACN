import { useRef, useState } from 'react';
import type { TripSession } from '../../types';
import { TripService } from '../../services/tripService';
import { isMandatoryPlannerActivity, movePlannerActivity, removePlannerActivity } from '../../utils/plannerCosts';
import { PlannerBudgetNotice } from './PlannerBudgetNotice';

type Props = { trip: TripSession; onSaved: (trip: TripSession) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void };

export function TripItineraryEditor({ trip, onSaved, onCancel, onBusyChange }: Props) {
  const [draft, setDraft] = useState(() => structuredClone(trip));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const save = async () => {
    if (pending.current) return;
    pending.current = true; setSaving(true); onBusyChange(true); setError(null);
    try {
      // PUT only changed days. The server retains metadata/ownership and derives
      // IDs/totals/check-in reconciliation; never POST a second Trip here.
      const updated = await TripService.updateTrip(trip.id, { days: draft.days });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể lưu lịch trình. Bản nháp vẫn được giữ; hãy thử lại hoặc hủy.');
    } finally { pending.current = false; setSaving(false); onBusyChange(false); }
  };
  const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
  return (
    <section aria-label="Chỉnh sửa lịch trình đã lưu" data-testid="trip-itinerary-editor" className="mb-6 bg-white border border-sky-200 rounded-2xl p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-bold">Bản nháp lịch trình</h2>
      <p className="text-sm text-slate-600">Sắp xếp bằng nút Lên/Xuống hoặc xóa hoạt động tùy chọn. Địa điểm bắt buộc và phí lưu trú được giữ. Thay đổi chỉ được lưu khi bạn chọn Lưu lịch trình.</p>
      <PlannerBudgetNotice budget={draft.totalBudgetUserVND} estimate={draft.totalEstimatedCostVND} />
      {draft.days.map(day => <div key={day.dayNumber} className="border rounded-xl p-3 space-y-3">
        <h3 className="font-bold">Ngày {day.dayNumber} • {day.date} • {money(day.dayEstimatedCostVND)} / nhóm</h3>
        <p className="text-xs text-slate-600">Lưu trú {day.lodgingNights ?? 0} đêm: {money(day.lodgingEstimatedCostVND ?? 0)} / nhóm. {day.lodgingCostSource}</p>
        {day.activities.map((activity, index) => <article key={activity.id} data-testid="trip-editor-activity" data-activity-id={activity.id} data-place-id={activity.placeId ?? ''} className="border rounded-xl p-3 space-y-2">
          <div className="font-semibold text-sm break-words">{activity.title} • {money(activity.estimatedCostVND)} / nhóm</div>
          {isMandatoryPlannerActivity(activity) && <p className="text-xs font-bold text-amber-800">Địa điểm bắt buộc — giữ trong lịch trình.</p>}
          {activity.costSource && <p className="text-xs text-slate-600">{activity.costSource}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-label="Di chuyển lên" disabled={saving || index === 0} onClick={() => setDraft(value => movePlannerActivity(value, day.dayNumber, index, 'up'))} className="border rounded-lg px-3 py-2 text-sm disabled:opacity-40">Lên</button>
            <button type="button" aria-label="Di chuyển xuống" disabled={saving || index === day.activities.length - 1} onClick={() => setDraft(value => movePlannerActivity(value, day.dayNumber, index, 'down'))} className="border rounded-lg px-3 py-2 text-sm disabled:opacity-40">Xuống</button>
            <button type="button" aria-label="Xóa địa điểm này" disabled={saving || isMandatoryPlannerActivity(activity)} onClick={() => setDraft(value => removePlannerActivity(value, day.dayNumber, activity.id))} className="border rounded-lg px-3 py-2 text-sm text-rose-700 disabled:opacity-40">Xóa</button>
          </div>
        </article>)}
      </div>)}
      {error && <p role="alert" data-testid="trip-itinerary-save-error" className="text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={saving} data-testid="save-trip-itinerary" className="bg-sky-700 text-white font-bold px-4 py-3 rounded-xl disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu lịch trình'}</button>
        <button type="button" onClick={onCancel} disabled={saving} className="border px-4 py-3 rounded-xl disabled:opacity-50">Hủy chỉnh sửa</button>
      </div>
    </section>
  );
}
