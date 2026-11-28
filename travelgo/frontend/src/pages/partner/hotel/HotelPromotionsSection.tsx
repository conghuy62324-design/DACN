// Ưu đãi: ghi bằng API thật (POST/PUT …/promotions[/:id], If-Match). Danh sách ưu tiên GET đề xuất
// (PAC §4.1, cờ partnerPromotions, có `effective` do server tính); cờ tắt thì dùng s.promotions sẵn có.
import React, { useEffect, useState } from 'react';
import { BadgePercent, Plus } from 'lucide-react';
import {
  Alert,
  BO_FEATURES,
  BoButton,
  ConfirmDialog,
  DataColumn,
  DataTable,
  FormSection,
  NumberField,
  SelectField,
  StatusPill,
  TextField,
  errorMessage,
  fmtDate,
  fmtDateTime,
  fmtVnd,
} from '../../../components/backoffice';
import { PartnerBackofficeService } from '../../../services/partnerBackofficeService';
import { Editor, SectionProps, entityInput, freshPromotion, localHotelTime } from './shared';
import { EditDrawer, useEditParam } from './EditDrawer';

type SetFn = (key: string, value: any) => void;

const discountText = (p: any) => {
  if (p.kind === 'PERCENT_BPS') {
    const pct = (Number(p.value) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${pct}%${p.maxDiscountVnd != null ? `, tối đa ${fmtVnd(p.maxDiscountVnd)}` : ''}`;
  }
  return `${fmtVnd(p.value)} cho cả kỳ`;
};

const PromotionFields: React.FC<{ v: any; set: SetFn; s: any }> = ({ v, set, s }) => (
  <div className="hgbo-stack">
    <FormSection title="Thông tin" columns={2}>
      <TextField label="Tên ưu đãi" required value={v.name} onChange={(x) => set('name', x)} />
      <SelectField
        label="Trạng thái ưu đãi"
        value={v.status}
        options={[
          { value: 'DRAFT', label: 'Bản nháp' },
          { value: 'ACTIVE', label: 'Đang áp dụng' },
          { value: 'ARCHIVED', label: 'Đã kết thúc' },
        ]}
        onChange={(x) => set('status', x)}
      />
    </FormSection>
    <FormSection title="Mức giảm" columns={2}>
      <SelectField
        label="Loại ưu đãi"
        value={v.kind}
        options={[
          { value: 'PERCENT_BPS', label: 'Giảm theo %' },
          { value: 'FIXED_STAY', label: 'Giảm số tiền cho cả kỳ' },
        ]}
        onChange={(x) => set('kind', x)}
      />
      <NumberField
        label={v.kind === 'PERCENT_BPS' ? 'Giảm phần trăm (%)' : 'Giảm cố định cho cả kỳ (VND)'}
        step={v.kind === 'PERCENT_BPS' ? '0.01' : '1'}
        min={0}
        value={v.value === null ? null : v.kind === 'PERCENT_BPS' ? v.value / 100 : v.value}
        onChange={(x) => set('value', x === null ? null : v.kind === 'PERCENT_BPS' ? Math.round(x * 100) : x)}
      />
      <NumberField
        label="Giảm tối đa (VND)"
        min={0}
        hint="Để trống: không giới hạn."
        value={v.maxDiscountVnd}
        onChange={(x) => set('maxDiscountVnd', x)}
      />
    </FormSection>
    <FormSection title="Phạm vi" columns={2}>
      <SelectField
        label="Hạng phòng áp dụng"
        value={v.roomTypeId || ''}
        options={[{ value: '', label: 'Toàn khách sạn' }, ...s.rooms.map((r: any) => ({ value: r.id, label: r.name }))]}
        onChange={(x) => {
          set('roomTypeId', x || null);
          set('ratePlanId', null);
        }}
      />
      <SelectField
        label="Gói giá áp dụng"
        value={v.ratePlanId || ''}
        options={[{ value: '', label: 'Mọi gói của phạm vi' }, ...s.rates.filter((r: any) => r.roomTypeId === v.roomTypeId).map((r: any) => ({ value: r.id, label: r.name }))]}
        onChange={(x) => set('ratePlanId', x || null)}
      />
    </FormSection>
    <FormSection title="Thời gian đặt" description="Giờ Việt Nam." columns={2}>
      {([
        ['bookingStartsAt', 'Mở nhận ưu đãi (giờ Việt Nam)'],
        ['bookingEndsAt', 'Kết thúc nhận ưu đãi (giờ Việt Nam)'],
      ] as [string, string][]).map(([k, l]) => (
        <TextField
          key={k}
          label={l}
          type="datetime-local"
          value={localHotelTime(v[k])}
          onChange={(x) => set(k, x ? new Date(x + ':00+07:00').toISOString() : '')}
        />
      ))}
    </FormSection>
    <FormSection title="Thời gian lưu trú" columns={2}>
      <TextField label="Lưu trú từ" type="date" value={v.stayFrom} onChange={(x) => set('stayFrom', x)} />
      <TextField label="Lưu trú đến trước ngày" type="date" value={v.stayUntil} onChange={(x) => set('stayUntil', x)} hint="Ngày kết thúc không bao gồm." />
    </FormSection>
    <FormSection title="Điều kiện">
      <NumberField label="Đêm tối thiểu" min={1} value={v.minNights} onChange={(x) => set('minNights', x)} />
    </FormSection>
    <Alert tone="info">
      <p>Việc áp dụng, cộng dồn và hết hạn ưu đãi do máy chủ quyết định theo giờ máy chủ.</p>
    </Alert>
  </div>
);

export const HotelPromotionsSection: React.FC<SectionProps> = ({ s, write }) => {
  const edit = useEditParam();
  const promoId = edit.value && edit.value !== 'new' ? edit.value : '';
  const promo = s.promotions.find((p: any) => p.id === promoId);
  const open = edit.value === 'new' || !!promo;
  const [ending, setEnding] = useState<any>(null);
  const [remote, setRemote] = useState<any[] | null>(null);
  const [remoteError, setRemoteError] = useState('');
  const useApi = BO_FEATURES.partnerPromotions;

  useEffect(() => {
    if (!useApi) return;
    let live = true;
    PartnerBackofficeService.hotelPromotions(s.identity.id)
      .then((data) => live && setRemote(data.items || []))
      .catch((e) => live && setRemoteError(errorMessage(e, 'Không tải được danh sách ưu đãi.')));
    return () => {
      live = false;
    };
  }, [useApi, s.identity.id, s.revision]);

  const rows = useApi && remote ? remote : s.promotions;
  const scope = (p: any) => {
    if (p.ratePlanId) return `Gói: ${s.rates.find((r: any) => r.id === p.ratePlanId)?.name || '—'}`;
    if (p.roomTypeId) return `Phòng: ${s.rooms.find((r: any) => r.id === p.roomTypeId)?.name || '—'}`;
    return 'Toàn khách sạn';
  };

  const columns: DataColumn<any>[] = [
    { key: 'name', header: 'Ưu đãi', primary: true, render: (p) => <span className="hgbo-strong">{p.name}</span> },
    { key: 'discount', header: 'Mức giảm', render: discountText },
    { key: 'scope', header: 'Phạm vi', hideBelow: 1024, render: scope },
    { key: 'booking', header: 'Thời gian đặt', hideBelow: 1280, render: (p) => `${fmtDateTime(p.bookingStartsAt)} → ${fmtDateTime(p.bookingEndsAt)}` },
    { key: 'stay', header: 'Thời gian lưu trú', hideBelow: 1024, render: (p) => `${fmtDate(p.stayFrom)} → ${fmtDate(p.stayUntil)}` },
    { key: 'minNights', header: 'Tối thiểu', hideBelow: 1280, render: (p) => `${p.minNights} đêm` },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (p) => (
        <div className="hgp-cellstack">
          <StatusPill status={p.status} domain="promotion" size="sm" />
          {p.effective && <StatusPill status={p.effective} domain="promotion" size="sm" />}
        </div>
      ),
    },
  ];

  return (
    <div className="hgbo-stack">
      <div className="hgbo-section-head">
        <h2 className="hgbo-section-title">Ưu đãi ({rows.length})</h2>
        <BoButton variant="primary" icon={Plus} onClick={() => edit.open('new')}>Thêm ưu đãi</BoButton>
      </div>
      {remoteError && <Alert tone="warning">{remoteError} Đang hiện danh sách từ dữ liệu khách sạn.</Alert>}
      <DataTable
        caption="Danh sách ưu đãi"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => edit.open(p.id)}
        selectedKey={promoId || null}
        rowActions={(p) => [
          { label: 'Sửa', onClick: () => edit.open(p.id) },
          ...(p.status !== 'ARCHIVED' ? [{ label: 'Kết thúc ưu đãi', tone: 'danger' as const, onClick: () => setEnding(p) }] : []),
        ]}
        empty={{ icon: BadgePercent, title: 'Chưa có ưu đãi', description: 'Tạo ưu đãi theo phần trăm hoặc số tiền cho cả kỳ lưu trú.' }}
      />
      <EditDrawer
        open={open}
        width="md"
        title={promo ? promo.name : 'Thêm ưu đãi'}
        status={promo?.status}
        statusDomain="promotion"
        onClose={edit.close}
      >
        {(setDirty) => (
          <Editor
            key={promoId || 'new'}
            initial={promo ? entityInput(promo) : freshPromotion()}
            creating={!promo}
            label={promo ? 'Lưu ưu đãi' : 'Tạo ưu đãi'}
            onDirtyChange={setDirty}
            save={async (v: any) => {
              await write('promotions' + (promoId ? '/' + promoId : ''), promoId ? 'put' : 'post', v);
              setDirty(false);
              edit.close();
            }}
          >
            {(v: any, set: any) => <PromotionFields v={v} set={set} s={s} />}
          </Editor>
        )}
      </EditDrawer>
      <ConfirmDialog
        open={!!ending}
        title="Kết thúc ưu đãi"
        tone="danger"
        description={ending ? `Ưu đãi “${ending.name}” sẽ chuyển sang Đã kết thúc. Dữ liệu được giữ lại, không xóa.` : undefined}
        confirmLabel="Kết thúc ưu đãi"
        onClose={() => setEnding(null)}
        onConfirm={async () => {
          const source = s.promotions.find((p: any) => p.id === ending.id) || ending;
          const body = entityInput(source);
          delete (body as any).effective;
          await write('promotions/' + ending.id, 'put', { ...body, status: 'ARCHIVED' });
        }}
      />
    </div>
  );
};
