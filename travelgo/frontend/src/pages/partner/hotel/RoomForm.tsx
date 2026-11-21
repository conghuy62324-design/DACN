// Form hạng phòng: vẫn là Editor với freshRoom()/roomInput(); chỉ đổi giao diện.
// Tiện nghi ở đây là CẤP PHÒNG (15 mã); tiện nghi cấp khách sạn ở mục Cơ sở › Thông tin.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BoButton, CheckboxGroup, FormSection, NumberField, SelectField, TextField, TextareaField, TriStateField } from '../../../components/backoffice';
import { BED_LABELS, ROOM_AMENITIES, ROOM_AMENITY_LABELS, VIEWS, opts } from './shared';

type SetFn = (key: string, value: any) => void;

const BEDS = ['SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'BUNK', 'SOFA', 'OTHER'];

const VIEW_LABELS: Record<string, string> = { UNKNOWN: 'Chưa rõ', SEA: 'Biển', MOUNTAIN: 'Núi', CITY: 'Thành phố', GARDEN: 'Vườn', LAKE: 'Hồ', POOL: 'Hồ bơi', NONE: 'Không có hướng nhìn' };

export const viewLabel = (code: string) => VIEW_LABELS[code] || code;

export const RoomFields: React.FC<{ v: any; set: SetFn }> = ({ v, set }) => (
  <div className="hgbo-stack">
    <FormSection title="Thông tin cơ bản" columns={2}>
      <TextField label="Tên hạng phòng" required span value={v.name} onChange={(x) => set('name', x)} />
      <TextareaField label="Mô tả phòng" required span rows={4} value={v.description} onChange={(x) => set('description', x)} />
      <NumberField label="Diện tích m²" step="any" min={0} value={v.areaM2} onChange={(x) => set('areaM2', x)} />
      <SelectField
        label="Trạng thái hạng phòng"
        value={v.status}
        options={[
          { value: 'DRAFT', label: 'Bản nháp' },
          { value: 'ACTIVE', label: 'Đang áp dụng' },
          { value: 'ARCHIVED', label: 'Đã lưu trữ' },
        ]}
        hint="Phòng đã có đơn thì lưu trữ, không xóa."
        onChange={(x) => set('status', x)}
      />
    </FormSection>
    <FormSection title="Sức chứa & giường" columns={2}>
      {([
        ['maxOccupancy', 'Tổng sức chứa'],
        ['maxAdults', 'Người lớn tối đa'],
        ['maxChildren', 'Trẻ em tối đa'],
        ['bedrooms', 'Số phòng ngủ'],
        ['bathrooms', 'Số phòng tắm'],
      ] as [string, string][]).map(([k, l]) => (
        <NumberField key={k} label={l} min={0} value={v[k]} onChange={(x) => set(k, x)} />
      ))}
      <fieldset className="hgbo-checks hgbo-field--span">
        <legend className="hgbo-field__label">Cấu hình giường</legend>
        <div className="hgp-beds">
          {v.beds.map((b: any, i: number) => (
            <div className="hgp-beds__row" key={i}>
              <SelectField
                label={`Loại giường ${i + 1}`}
                value={b.type}
                options={opts(BEDS, BED_LABELS)}
                onChange={(x) => set('beds', v.beds.map((a: any, n: number) => (n === i ? { ...a, type: x } : a)))}
              />
              <NumberField
                label="Số giường"
                min={1}
                value={b.quantity}
                onChange={(x) => set('beds', v.beds.map((a: any, n: number) => (n === i ? { ...a, quantity: x } : a)))}
              />
              <BoButton
                variant="ghost"
                icon={Trash2}
                aria-label={`Bỏ loại giường ${i + 1}`}
                disabled={v.beds.length <= 1}
                onClick={() => set('beds', v.beds.filter((_: any, n: number) => n !== i))}
              />
            </div>
          ))}
        </div>
        <BoButton
          variant="ghost"
          icon={Plus}
          disabled={v.beds.length >= 8}
          onClick={() => set('beds', [...v.beds, { type: 'SINGLE', quantity: 1 }])}
        >
          Thêm giường
        </BoButton>
      </fieldset>
      <TriStateField label="Giường phụ" value={v.extraBedAvailable} onChange={(x) => set('extraBedAvailable', x)} />
    </FormSection>
    <FormSection title="Đặc điểm phòng" description="Chọn “Chưa rõ” khi chưa xác nhận; hệ thống không coi là “Không”." columns={2}>
      <SelectField
        label="Hướng nhìn do đối tác cung cấp"
        span
        value={v.view}
        options={opts(VIEWS, VIEW_LABELS)}
        onChange={(x) => set('view', x)}
      />
      {([
        ['balcony', 'Ban công'],
        ['hasWindow', 'Cửa sổ'],
        ['kitchen', 'Bếp'],
        ['privateBathroom', 'Phòng tắm riêng'],
      ] as [string, string][]).map(([k, l]) => (
        <TriStateField key={k} label={l} value={v[k]} onChange={(x) => set(k, x)} />
      ))}
    </FormSection>
    <FormSection title="Tiện nghi trong phòng" description="Chỉ có trong hạng phòng này.">
      <CheckboxGroup
        legend="Tiện nghi riêng của phòng"
        columns={3}
        options={ROOM_AMENITIES.map((code) => ({ value: code, label: ROOM_AMENITY_LABELS[code] }))}
        value={v.amenities}
        onChange={(x) => set('amenities', x)}
      />
    </FormSection>
  </div>
);
