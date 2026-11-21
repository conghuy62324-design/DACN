// Gói giá: bảng + drawer RateForm (vẫn freshRate()/entityInput(), write('rates[/id]', post|put)).
// Giá luôn là VND theo phòng/đêm (PER_ROOM_NIGHT).
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Plus, Tags, Trash2 } from 'lucide-react';
import {
  Alert,
  BoButton,
  DataColumn,
  DataTable,
  FormSection,
  NumberField,
  SelectField,
  StatusPill,
  TextField,
  fmtDate,
  fmtVnd,
} from '../../../components/backoffice';
import { Editor, SectionProps, entityInput, freshRate, label, opts } from './shared';
import { EditDrawer, useEditParam } from './EditDrawer';

type SetFn = (key: string, value: any) => void;

const cancelText = (r: any) => (r.cancellation?.kind === 'FREE_UNTIL_CUTOFF'
  ? `Miễn phí trước ${r.cancellation.cutoffHours ?? '?'} giờ`
  : label(r.cancellation?.kind));

export const RateFields: React.FC<{ v: any; set: SetFn; rooms: any[] }> = ({ v, set, rooms }) => (
  <div className="hgbo-stack">
    <FormSection title="Cơ bản" description="Đơn vị giá: VND · theo phòng/đêm." columns={2}>
      <TextField label="Tên gói giá" required value={v.name} onChange={(x) => set('name', x)} />
      <SelectField
        label="Hạng phòng áp dụng"
        required
        value={v.roomTypeId}
        options={rooms.map((r: any) => ({ value: r.id, label: r.name }))}
        onChange={(x) => set('roomTypeId', x)}
      />
      <NumberField label="Giá VND mỗi phòng/đêm" required min={0} value={v.baseAmountVnd} onChange={(x) => set('baseAmountVnd', x)} hint={v.baseAmountVnd != null ? fmtVnd(v.baseAmountVnd) + ' /phòng/đêm' : undefined} />
      <SelectField
        label="Trạng thái gói giá"
        value={v.status}
        options={opts(['DRAFT', 'ACTIVE', 'ARCHIVED'])}
        onChange={(x) => set('status', x)}
      />
      <TextField label="Áp dụng từ" type="date" value={v.validFrom} onChange={(x) => set('validFrom', x)} />
      <TextField label="Đến trước ngày" type="date" value={v.validUntil} onChange={(x) => set('validUntil', x)} hint="Ngày kết thúc không bao gồm." />
    </FormSection>
    <FormSection title="Thời gian lưu trú" columns={2}>
      <NumberField label="Đêm tối thiểu" min={1} value={v.minNights} onChange={(x) => set('minNights', x)} />
      <NumberField label="Đêm tối đa" min={1} value={v.maxNights} onChange={(x) => set('maxNights', x)} />
    </FormSection>
    <FormSection title="Người & trẻ em" columns={2}>
      <NumberField label="Người lớn đã bao gồm" min={1} value={v.includedAdults} onChange={(x) => set('includedAdults', x)} />
      <NumberField label="Phụ thu người lớn VND/đêm" min={0} hint="Để trống: chưa rõ." value={v.extraAdultVndPerNight} onChange={(x) => set('extraAdultVndPerNight', x)} />
      <SelectField
        label="Chính sách trẻ em"
        span
        value={v.childPolicy}
        options={opts(['UNKNOWN', 'NOT_ALLOWED', 'INCLUDED', 'BANDS_REQUIRED'])}
        onChange={(x) => set('childPolicy', x)}
      />
      {v.childPolicy === 'BANDS_REQUIRED' && (
        <fieldset className="hgbo-checks hgbo-field--span">
          <legend className="hgbo-field__label">Phụ thu theo tuổi, VND/đêm</legend>
          {v.childBands.map((b: any, i: number) => (
            <div className="hgp-beds__row hgp-beds__row--3" key={i}>
              {(['minAge', 'maxAge', 'amountVndPerNight'] as const).map((k, j) => (
                <NumberField
                  key={k}
                  label={['Từ tuổi', 'Đến tuổi', 'Phụ thu'][j]}
                  min={0}
                  value={b[k]}
                  onChange={(x) => set('childBands', v.childBands.map((a: any, n: number) => (n === i ? { ...a, [k]: x } : a)))}
                />
              ))}
              <BoButton
                variant="ghost"
                icon={Trash2}
                aria-label={`Bỏ khoảng tuổi ${i + 1}`}
                onClick={() => set('childBands', v.childBands.filter((_: any, n: number) => n !== i))}
              />
            </div>
          ))}
          <BoButton variant="ghost" icon={Plus} onClick={() => set('childBands', [...v.childBands, { minAge: 0, maxAge: 5, amountVndPerNight: 0 }])}>
            Thêm khoảng tuổi
          </BoButton>
        </fieldset>
      )}
    </FormSection>
    <FormSection title="Bữa ăn">
      <SelectField label="Bữa ăn" value={v.mealPlan} options={opts(['ROOM_ONLY', 'BREAKFAST_INCLUDED'])} onChange={(x) => set('mealPlan', x)} />
    </FormSection>
    <FormSection title="Hủy phòng" columns={2}>
      <SelectField
        label="Chính sách hủy"
        value={v.cancellation.kind}
        options={opts(['NON_REFUNDABLE', 'FREE_UNTIL_CUTOFF', 'CONDITIONAL'])}
        onChange={(x) => set('cancellation', { ...v.cancellation, kind: x })}
      />
      <NumberField
        label="Hủy miễn phí trước nhận phòng (giờ)"
        min={0}
        value={v.cancellation.cutoffHours}
        onChange={(x) => set('cancellation', { ...v.cancellation, cutoffHours: x })}
      />
      <TextField label="Điều khoản hủy" span value={v.cancellation.terms} onChange={(x) => set('cancellation', { ...v.cancellation, terms: x })} />
    </FormSection>
    <FormSection title="Thuế & phí" columns={2}>
      <SelectField label="Thuế" value={v.tax.mode} options={opts(['UNKNOWN', 'INCLUDED', 'EXCLUDED'])} onChange={(x) => set('tax', { ...v.tax, mode: x })} />
      <NumberField
        label="Thuế %"
        step="any"
        min={0}
        value={v.tax.basisPoints === null ? null : v.tax.basisPoints / 100}
        onChange={(x) => set('tax', { ...v.tax, basisPoints: x === null ? null : Math.round(x * 100) })}
      />
      <fieldset className="hgbo-checks hgbo-field--span">
        <legend className="hgbo-field__label">Phụ phí bắt buộc</legend>
        {v.fees.map((f: any, i: number) => (
          <div className="hgp-fees__row" key={i}>
            <TextField label="Tên phí" value={f.code} onChange={(x) => set('fees', v.fees.map((a: any, n: number) => (n === i ? { ...a, code: x } : a)))} />
            <NumberField label="Số tiền VND" min={0} value={f.amountVnd} onChange={(x) => set('fees', v.fees.map((a: any, n: number) => (n === i ? { ...a, amountVnd: x } : a)))} />
            <SelectField
              label="Đơn vị phí"
              value={f.basis}
              options={opts(['PER_ROOM_NIGHT', 'PER_ROOM_STAY', 'PER_BOOKING'])}
              onChange={(x) => set('fees', v.fees.map((a: any, n: number) => (n === i ? { ...a, basis: x } : a)))}
            />
            <label className="hgp-inlinecheck">
              <input
                type="checkbox"
                checked={f.included}
                onChange={(e) => set('fees', v.fees.map((a: any, n: number) => (n === i ? { ...a, included: e.target.checked } : a)))}
              />
              Đã gồm trong giá
            </label>
            <BoButton variant="ghost" icon={Trash2} aria-label={`Bỏ phụ phí ${i + 1}`} onClick={() => set('fees', v.fees.filter((_: any, n: number) => n !== i))} />
          </div>
        ))}
        <BoButton variant="ghost" icon={Plus} onClick={() => set('fees', [...v.fees, { code: '', amountVnd: 0, basis: 'PER_BOOKING', included: false }])}>
          Thêm phụ phí
        </BoButton>
      </fieldset>
      <label className="hgp-inlinecheck hgbo-field--span">
        <input type="checkbox" checked={v.mandatoryFeesKnown} onChange={(e) => set('mandatoryFeesKnown', e.target.checked)} />
        Đã kê khai đầy đủ phụ phí bắt buộc
      </label>
    </FormSection>
  </div>
);

export const HotelRatesSection: React.FC<SectionProps & { compact?: boolean }> = ({ s, write, hotelUrl, compact }) => {
  const edit = useEditParam();
  const rateId = edit.value && edit.value !== 'new' ? edit.value : '';
  const rate = s.rates.find((r: any) => r.id === rateId);
  const open = edit.value === 'new' || !!rate;
  const roomName = (id: string) => s.rooms.find((r: any) => r.id === id)?.name || '—';

  const columns: DataColumn<any>[] = [
    { key: 'name', header: 'Gói giá', primary: true, render: (r) => <span className="hgbo-strong">{r.name}</span> },
    { key: 'room', header: 'Hạng phòng', render: (r) => roomName(r.roomTypeId) },
    { key: 'base', header: 'Giá cơ sở', align: 'right', render: (r) => <span className="hgbo-num">{fmtVnd(r.baseAmountVnd)}<span className="hgbo-muted hgbo-small"> /phòng/đêm</span></span> },
    { key: 'meal', header: 'Bữa ăn', hideBelow: 1024, render: (r) => label(r.mealPlan) },
    { key: 'cancel', header: 'Hủy phòng', hideBelow: 1280, render: cancelText },
    { key: 'valid', header: 'Hiệu lực', hideBelow: 1280, render: (r) => `${fmtDate(r.validFrom)} → ${fmtDate(r.validUntil)}` },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusPill status={r.status} domain="rate" size="sm" /> },
  ];

  return (
    <div className="hgbo-stack">
      <div className="hgbo-section-head">
        <h2 className="hgbo-section-title">{compact ? 'Gói giá' : `Gói giá (${s.rates.length})`}</h2>
        <BoButton variant="primary" icon={Plus} disabled={!s.rooms.length} title={!s.rooms.length ? 'Tạo hạng phòng trước' : undefined} onClick={() => edit.open('new')}>
          Thêm gói giá
        </BoButton>
      </div>
      {!s.rooms.length && (
        <Alert tone="info">
          <p>Cần có ít nhất một hạng phòng trước khi tạo gói giá.</p>
        </Alert>
      )}
      <DataTable
        caption="Danh sách gói giá"
        columns={columns}
        rows={s.rates}
        rowKey={(r) => r.id}
        onRowClick={(r) => edit.open(r.id)}
        selectedKey={rateId || null}
        rowActions={(r) => [
          { label: 'Sửa', onClick: () => edit.open(r.id) },
          { label: 'Giá theo ngày', to: `${hotelUrl}/calendar?room=${r.roomTypeId}&rate=${r.id}` },
        ]}
        empty={{ icon: Tags, title: 'Chưa có gói giá', description: 'Gói giá quy định giá VND theo phòng/đêm, bữa ăn và chính sách hủy.' }}
      />
      <p className="hgbo-small hgbo-muted">Chính sách hủy cấu hình theo từng gói giá. Giá từng ngày chỉnh ở Lịch tháng.</p>
      <EditDrawer
        open={open}
        title={rate ? rate.name : 'Thêm gói giá'}
        subtitle="VND · theo phòng/đêm"
        status={rate?.status}
        statusDomain="rate"
        onClose={edit.close}
      >
        {(setDirty) => (
          <>
            {rate && (
              <p className="hgbo-small">
                <Link className="hgbo-link" to={`${hotelUrl}/calendar?room=${rate.roomTypeId}&rate=${rate.id}`}>
                  <CalendarRange size={14} aria-hidden="true" /> Sửa giá theo ngày
                </Link>
              </p>
            )}
            <Editor
              key={rateId || 'new'}
              initial={rate ? entityInput(rate) : freshRate(s.rooms[0]?.id || '')}
              creating={!rate}
              label={rate ? 'Lưu gói giá' : 'Tạo gói giá'}
              onDirtyChange={setDirty}
              save={async (v: any) => {
                await write('rates' + (rateId ? '/' + rateId : ''), rateId ? 'put' : 'post', v);
                setDirty(false);
                edit.close();
              }}
            >
              {(v: any, set: any) => <RateFields v={v} set={set} rooms={s.rooms} />}
            </Editor>
          </>
        )}
      </EditDrawer>
    </div>
  );
};
