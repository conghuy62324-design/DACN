// Lịch giá & tồn phòng dạng tháng (thay giao diện DayCalendar cũ, giữ body + path ghi):
//   tồn:  write('rooms/{roomId}/inventory','put',{days:[{stayDate, sellableQuantity, closed, expectedVersion}]})
//   giá:  write('rates/{rateId}/calendar','put',{days:[{stayDate, amountVnd, closed, expectedVersion}]})
// Khoảng chọn là các ĐÊM (tính cả hai đầu); ngày khách trả phòng = đêm cuối + 1 (không bao gồm). Tối đa 90 đêm.
// allocatedQuantity chỉ đọc (hệ thống tự ghi khi có đơn); chặn sellable < số đã đặt cao nhất trong khoảng.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, ChevronLeft, ChevronRight, Info, ListChecks } from 'lucide-react';
import {
  Alert,
  BoButton,
  DetailDrawer,
  EmptyState,
  NumberField,
  SelectField,
  StatusPill,
  errorMessage,
  fmtNumber,
  fmtVnd,
} from '../../../components/backoffice';
import { SectionProps, addDays, ddmm, diffDays, todayVN, useMedia } from './shared';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MAX_NIGHTS = 90;

const weekday = (date: string) => {
  const d = new Date(date + 'T00:00:00Z').getUTCDay();
  return WEEKDAYS[(d + 6) % 7];
};

const compactVnd = (amount: number) => (amount >= 1000 && amount % 1000 === 0 ? `${fmtNumber(amount / 1000)}k` : fmtNumber(amount));

const monthDays = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};

const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

type Range = { start: string; end: string } | null;

const orderRange = (a: string, b: string): { start: string; end: string } => (a <= b ? { start: a, end: b } : { start: b, end: a });

const nightsOf = (range: { start: string; end: string }) => diffDays(range.start, range.end) + 1;

const listNights = (range: { start: string; end: string }) => Array.from({ length: Math.min(nightsOf(range), 400) }, (_, i) => addDays(range.start, i));

interface UpdatePanelProps extends SectionProps {
  range: { start: string; end: string };
  roomId: string;
  rateId: string;
  invFind: (d: string) => any;
  rateFind: (d: string) => any;
  onDone: () => void;
}

const UpdatePanel: React.FC<UpdatePanelProps> = ({ s, write, range, roomId, rateId, invFind, rateFind, onDone }) => {
  const nights = listNights(range);
  const count = nightsOf(range);
  const tooLong = count > MAX_NIGHTS;
  const firstInv = invFind(range.start);
  const firstRate = rateFind(range.start);
  const maxAllocated = nights.reduce((max, d) => Math.max(max, Number(invFind(d)?.allocatedQuantity || 0)), 0);
  const room = s.rooms.find((r: any) => r.id === roomId);
  const rate = s.rates.find((r: any) => r.id === rateId);

  const [applyInv, setApplyInv] = useState(true);
  const [sellable, setSellable] = useState<number | null>(firstInv ? firstInv.sellableQuantity : null);
  const [invClosed, setInvClosed] = useState<boolean>(firstInv ? !!firstInv.closed : false);
  const [applyRate, setApplyRate] = useState(true);
  const [amount, setAmount] = useState<number | null>(firstRate ? firstRate.amountVnd : rate?.baseAmountVnd ?? null);
  const [rateClosed, setRateClosed] = useState<boolean>(firstRate ? !!firstRate.closed : false);
  const [busy, setBusy] = useState<'' | 'inv' | 'rate'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSellable(firstInv ? firstInv.sellableQuantity : null);
    setInvClosed(firstInv ? !!firstInv.closed : false);
    setAmount(firstRate ? firstRate.amountVnd : rate?.baseAmountVnd ?? null);
    setRateClosed(firstRate ? !!firstRate.closed : false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, roomId, rateId]);

  const invError = sellable === null
    ? 'Nhập số phòng bán được.'
    : sellable < 0 || !Number.isInteger(sellable)
      ? 'Số phòng là số nguyên từ 0.'
      : sellable < maxAllocated
        ? `Không thể thấp hơn số phòng đã đặt (${maxAllocated}).`
        : '';
  const rateError = amount === null ? 'Nhập giá.' : amount < 0 || !Number.isInteger(amount) ? 'Giá là số nguyên VND từ 0.' : '';

  const save = async (kind: 'inv' | 'rate') => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'inv') {
        const body = { days: nights.map((d) => ({ stayDate: d, sellableQuantity: sellable, closed: invClosed, expectedVersion: invFind(d)?.version || 0 })) };
        await write(`rooms/${roomId}/inventory`, 'put', body, { success: `Đã cập nhật tồn phòng ${count} ngày` });
      } else {
        const body = { days: nights.map((d) => ({ stayDate: d, amountVnd: amount, closed: rateClosed, expectedVersion: rateFind(d)?.version || 0 })) };
        await write(`rates/${rateId}/calendar`, 'put', body, { success: `Đã cập nhật giá ${count} ngày` });
      }
      onDone();
    } catch (e) {
      setError(errorMessage(e, 'Không lưu được lịch. Hãy tải lại khi có xung đột.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="hgp-panel">
      <div className="hgp-panel__head">
        <p className="hgp-panel__title">
          Cập nhật {ddmm(range.start)}
          {count > 1 ? ` – ${ddmm(range.end)}` : ''}
          {' · '}
          {count} đêm
        </p>
        <p className="hgbo-small hgbo-muted">
          Đêm cuối: {ddmm(range.end)} (khách trả phòng {ddmm(addDays(range.end, 1))})
        </p>
      </div>
      {tooLong && (
        <Alert tone="danger">
          <p>Mỗi lần cập nhật tối đa {MAX_NIGHTS} đêm. Hãy chọn khoảng ngắn hơn.</p>
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <fieldset className="hgp-panel__block" disabled={tooLong || !roomId}>
        <legend className="hgp-panel__legend">
          <span>Tồn phòng — {room?.name || 'chưa chọn hạng phòng'}</span>
          <label className="hgp-inlinecheck">
            <input type="checkbox" checked={applyInv} onChange={(e) => setApplyInv(e.target.checked)} />
            Áp dụng
          </label>
        </legend>
        <NumberField
          label="Số phòng bán được"
          min={0}
          value={sellable}
          disabled={!applyInv}
          error={applyInv ? invError || null : null}
          hint={`Đã đặt cao nhất trong khoảng: ${maxAllocated}. Số đã đặt do hệ thống ghi khi có đơn, không chỉnh tay.`}
          onChange={setSellable}
        />
        <div className="hgp-radios" role="radiogroup" aria-label="Trạng thái bán phòng">
          <label>
            <input type="radio" name="inv-open" checked={!invClosed} disabled={!applyInv} onChange={() => setInvClosed(false)} />
            Mở bán
          </label>
          <label>
            <input type="radio" name="inv-open" checked={invClosed} disabled={!applyInv} onChange={() => setInvClosed(true)} />
            Đóng bán
          </label>
        </div>
        <BoButton
          variant="primary"
          loading={busy === 'inv'}
          disabled={!applyInv || !!invError || !!busy}
          onClick={() => save('inv')}
        >
          Lưu tồn phòng
        </BoButton>
      </fieldset>
      <fieldset className="hgp-panel__block" disabled={tooLong || !rateId}>
        <legend className="hgp-panel__legend">
          <span>Giá — {rate?.name || 'chưa có gói giá'}</span>
          <label className="hgp-inlinecheck">
            <input type="checkbox" checked={applyRate} onChange={(e) => setApplyRate(e.target.checked)} />
            Áp dụng
          </label>
        </legend>
        <NumberField
          label="Giá ₫/phòng/đêm"
          min={0}
          value={amount}
          disabled={!applyRate}
          error={applyRate && rateId ? rateError || null : null}
          hint={amount != null && !rateError ? fmtVnd(amount) + ' · VND theo phòng/đêm' : 'VND theo phòng/đêm'}
          onChange={setAmount}
        />
        <div className="hgp-radios" role="radiogroup" aria-label="Trạng thái bán giá">
          <label>
            <input type="radio" name="rate-open" checked={!rateClosed} disabled={!applyRate} onChange={() => setRateClosed(false)} />
            Mở bán
          </label>
          <label>
            <input type="radio" name="rate-open" checked={rateClosed} disabled={!applyRate} onChange={() => setRateClosed(true)} />
            Đóng bán
          </label>
        </div>
        <BoButton
          variant="primary"
          loading={busy === 'rate'}
          disabled={!applyRate || !!rateError || !!busy}
          onClick={() => save('rate')}
        >
          Lưu giá
        </BoButton>
      </fieldset>
      <p className="hgbo-small hgbo-muted">Không tính tổng tiền lưu trú ở đây; giá khách trả do máy chủ báo giá.</p>
    </div>
  );
};

const Legend: React.FC = () => (
  <ul className="hgp-legend" aria-label="Chú giải lịch">
    <li><span className="hgp-legend__sw is-closed" aria-hidden="true" />Đóng bán</li>
    <li><span className="hgp-legend__sw is-soldout" aria-hidden="true" />Hết phòng</li>
    <li><span className="hgp-legend__sw is-unset" aria-hidden="true" />Chưa thiết lập</li>
    <li><span className="hgp-legend__sw is-today" aria-hidden="true" />Hôm nay</li>
  </ul>
);

export const PriceInventoryCalendar: React.FC<SectionProps> = (props) => {
  const { s } = props;
  const [params, setParams] = useSearchParams();
  const today = todayVN();
  const wide = useMedia('(min-width:1280px)');
  const mobile = useMedia('(max-width:767px)');

  const roomParam = params.get('room');
  const roomId = s.rooms.some((r: any) => r.id === roomParam) ? roomParam! : s.rooms[0]?.id || '';
  const roomRates = s.rates.filter((r: any) => r.roomTypeId === roomId);
  const rateParam = params.get('rate');
  const rateId = roomRates.some((r: any) => r.id === rateParam) ? rateParam! : roomRates[0]?.id || '';

  const [month, setMonth] = useState(today.slice(0, 7));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(null);
  const [focusDate, setFocusDate] = useState(today);
  const [dragging, setDragging] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [multi, setMulti] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const invIndex = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of s.inventory) if (r.roomTypeId === roomId) map.set(r.stayDate, r);
    return map;
  }, [s.inventory, roomId]);
  const rateIndex = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of s.nightly) if (r.ratePlanId === rateId) map.set(r.stayDate, r);
    return map;
  }, [s.nightly, rateId]);
  const invFind = (d: string) => invIndex.get(d);
  const rateFind = (d: string) => rateIndex.get(d);

  const setParam = (patch: Record<string, string | null>) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return next;
  }, { replace: true });

  const days = monthDays(month);
  const lead = (new Date(days[0] + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const inRange = (d: string) => !!range && d >= range.start && d <= range.end;
  const pick = (d: string, extend: boolean) => {
    if (d < today) return;
    if (extend && anchor) {
      setRange(orderRange(anchor, d));
    } else {
      setAnchor(d);
      setRange({ start: d, end: d });
    }
    setFocusDate(d);
  };

  const focusCell = (d: string) => {
    if (d.slice(0, 7) !== month) setMonth(d.slice(0, 7));
    setFocusDate(d);
    window.requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-date="${d}"]`)?.focus());
  };

  const onGridKey = (event: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (step[event.key] !== undefined) {
      event.preventDefault();
      const next = addDays(focusDate, step[event.key]);
      if (event.shiftKey && next >= today) {
        if (!anchor) setAnchor(focusDate);
        setRange(orderRange(anchor || focusDate, next));
      }
      focusCell(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(focusDate, event.shiftKey);
    } else if (event.key === 'Escape') {
      setRange(null);
      setAnchor(null);
    }
  };

  const cellInfo = (d: string) => {
    const inv = invFind(d);
    const nightly = rateFind(d);
    const remaining = inv ? Math.max(0, inv.sellableQuantity - inv.allocatedQuantity) : null;
    const closedParts = [inv?.closed ? 'phòng' : '', nightly?.closed ? 'giá' : ''].filter(Boolean);
    const unset = !inv && !nightly;
    const soldOut = !!inv && !inv.closed && remaining === 0;
    const full = [
      `${weekday(d)} ${ddmm(d)}`,
      nightly ? `Giá ${fmtVnd(nightly.amountVnd)}` : 'Chưa có giá',
      inv ? `Bán ${inv.sellableQuantity}, đã đặt ${inv.allocatedQuantity}, còn ${remaining}` : 'Chưa có tồn phòng',
      closedParts.length ? `Đóng bán ${closedParts.join(' và ')}` : '',
      soldOut ? 'Hết phòng' : '',
    ].filter(Boolean).join('. ');
    return { inv, nightly, remaining, closedParts, unset, soldOut, full };
  };

  const selected = range;
  const count = selected ? nightsOf(selected) : 0;

  if (!s.rooms.length) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Chưa có hạng phòng"
        description="Tạo hạng phòng và gói giá trước khi mở bán trên lịch."
      />
    );
  }

  const panel = selected ? (
    <UpdatePanel
      {...props}
      range={selected}
      roomId={roomId}
      rateId={rateId}
      invFind={invFind}
      rateFind={rateFind}
      onDone={() => setSheet(false)}
    />
  ) : (
    <div className="hgp-panel hgp-panel--empty">
      <Info aria-hidden="true" />
      <p>Chọn một ngày, hoặc giữ Shift (hay kéo chuột) để chọn nhiều đêm, rồi cập nhật tồn phòng và giá tại đây.</p>
    </div>
  );

  return (
    <div className="hgbo-stack hgp-cal">
      <div className="hgp-cal__toolbar">
        <SelectField
          label="Hạng phòng"
          value={roomId}
          options={s.rooms.map((r: any) => ({ value: r.id, label: r.name }))}
          onChange={(x) => setParam({ room: x, rate: null })}
        />
        <SelectField
          label="Gói giá"
          value={rateId}
          disabled={!roomRates.length}
          options={roomRates.length ? roomRates.map((r: any) => ({ value: r.id, label: r.name })) : [{ value: '', label: 'Chưa có gói giá cho hạng phòng này' }]}
          onChange={(x) => setParam({ rate: x })}
        />
        <div className="hgp-cal__month" role="group" aria-label="Chọn tháng">
          <BoButton variant="secondary" icon={ChevronLeft} aria-label="Tháng trước" onClick={() => setMonth(shiftMonth(month, -1))} />
          <span className="hgp-cal__monthlabel" aria-live="polite">Tháng {month.slice(5)}/{month.slice(0, 4)}</span>
          <BoButton variant="secondary" icon={ChevronRight} aria-label="Tháng sau" onClick={() => setMonth(shiftMonth(month, 1))} />
          <BoButton variant="ghost" onClick={() => { setMonth(today.slice(0, 7)); setFocusDate(today); }}>Hôm nay</BoButton>
        </div>
        {!mobile && <Legend />}
      </div>
      <div className={`hgp-cal__layout ${wide ? 'is-wide' : ''}`.trim()}>
        <div className="hgp-cal__main">
          {mobile ? (
            <>
              <div className="hgbo-row">
                <BoButton variant={multi ? 'primary' : 'secondary'} size="sm" icon={ListChecks} aria-pressed={multi} onClick={() => setMulti((v) => !v)}>
                  {multi ? 'Đang chọn nhiều ngày' : 'Chọn nhiều'}
                </BoButton>
                <Legend />
              </div>
              <ul className="hgp-agenda" aria-label={`Lịch tháng ${month.slice(5)}/${month.slice(0, 4)}`}>
                {days.map((d) => {
                  const info = cellInfo(d);
                  const past = d < today;
                  return (
                    <li key={d}>
                      <button
                        type="button"
                        className={['hgp-agenda__row', inRange(d) ? 'is-selected' : '', past ? 'is-past' : '', d === today ? 'is-today' : '', info.unset ? 'is-unset' : '', info.closedParts.length ? 'is-closed' : ''].filter(Boolean).join(' ')}
                        disabled={past}
                        aria-pressed={inRange(d)}
                        aria-label={info.full}
                        onClick={() => pick(d, multi && !!anchor && range?.start === range?.end)}
                      >
                        <span className="hgp-agenda__date">{weekday(d)} {ddmm(d)}</span>
                        <span className="hgp-agenda__price">{info.nightly ? compactVnd(info.nightly.amountVnd) : 'Chưa có giá'}</span>
                        <span className="hgp-agenda__inv">{info.inv ? `Còn ${info.remaining}/${info.inv.sellableQuantity}` : '—'}</span>
                        <span className="hgp-agenda__pill">
                          {info.closedParts.length > 0 && <StatusPill status="CLOSED" tone="danger" label="Đóng bán" size="sm" />}
                          {info.soldOut && <StatusPill status="SOLD_OUT" tone="warning" label="Hết phòng" size="sm" />}
                          {info.unset && <span className="hgbo-small hgbo-muted">Chưa thiết lập</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div
              ref={gridRef}
              className="hgp-grid"
              role="grid"
              aria-label={`Lịch giá và tồn phòng tháng ${month.slice(5)}/${month.slice(0, 4)}`}
              aria-multiselectable="true"
              onKeyDown={onGridKey}
            >
              <div className="hgp-grid__row hgp-grid__head" role="row">
                {WEEKDAYS.map((w) => (
                  <div key={w} role="columnheader" className="hgp-grid__wd">{w}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="hgp-grid__row" role="row">
                  {week.map((d, di) => {
                    if (!d) return <div key={`e${di}`} role="gridcell" className="hgp-day is-empty" aria-hidden="true" />;
                    const info = cellInfo(d);
                    const past = d < today;
                    const tabbable = d === focusDate || (!days.includes(focusDate) && d === days[0]);
                    return (
                      <div
                        key={d}
                        role="gridcell"
                        data-date={d}
                        tabIndex={tabbable ? 0 : -1}
                        aria-selected={inRange(d)}
                        aria-disabled={past || undefined}
                        aria-label={info.full}
                        title={info.closedParts.length ? `Đóng bán ${info.closedParts.join(' và ')}` : undefined}
                        className={['hgp-day', inRange(d) ? 'is-selected' : '', past ? 'is-past' : '', d === today ? 'is-today' : '', info.unset ? 'is-unset' : '', info.closedParts.length ? 'is-closed' : ''].filter(Boolean).join(' ')}
                        onMouseDown={(event) => {
                          if (past) return;
                          event.preventDefault();
                          pick(d, event.shiftKey);
                          if (!event.shiftKey) setDragging(true);
                        }}
                        onMouseEnter={() => {
                          if (dragging && anchor && !past) setRange(orderRange(anchor, d));
                        }}
                        onFocus={() => setFocusDate(d)}
                      >
                        <span className="hgp-day__num">{Number(d.slice(8))}</span>
                        <span className="hgp-day__price">
                          {info.nightly ? compactVnd(info.nightly.amountVnd) : <span className="hgp-day__none">Chưa có giá</span>}
                        </span>
                        {info.inv ? (
                          <span className="hgp-day__inv">
                            <span className="hgp-day__invfull">Bán {info.inv.sellableQuantity} · Đặt {info.inv.allocatedQuantity} · </span>
                            Còn {info.remaining}
                          </span>
                        ) : info.unset ? (
                          <span className="hgp-day__none">Chưa thiết lập</span>
                        ) : null}
                        {info.closedParts.length > 0 && <StatusPill status="CLOSED" tone="danger" label="Đóng bán" size="sm" className="hgp-day__pill" />}
                        {info.soldOut && <StatusPill status="SOLD_OUT" tone="warning" label="Hết phòng" size="sm" className="hgp-day__pill" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <p className="hgbo-small hgbo-muted">
            “Đặt” là số phòng hệ thống đã phân bổ cho đơn, chỉ đọc. Giá hiển thị là VND theo phòng/đêm.
          </p>
        </div>
        {wide && <aside className="hgp-cal__side" aria-label="Cập nhật khoảng ngày">{panel}</aside>}
      </div>
      {!wide && selected && (
        <div className="hgp-selbar" role="region" aria-label="Khoảng ngày đã chọn">
          <span>
            Đã chọn {ddmm(selected.start)}
            {count > 1 ? ` – ${ddmm(selected.end)}` : ''}
            {' · '}
            {count} đêm
          </span>
          <div className="hgbo-row">
            <BoButton variant="secondary" size="sm" onClick={() => { setRange(null); setAnchor(null); }}>Bỏ chọn</BoButton>
            <BoButton variant="primary" size="sm" onClick={() => setSheet(true)}>Cập nhật</BoButton>
          </div>
        </div>
      )}
      {!wide && (
        <DetailDrawer
          open={sheet && !!selected}
          width="sm"
          title="Cập nhật giá & tồn phòng"
          onClose={() => setSheet(false)}
        >
          {panel}
        </DetailDrawer>
      )}
    </div>
  );
};
