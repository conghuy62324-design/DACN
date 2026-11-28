import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { BoButton, CheckboxGroup, FormSection, SelectField, TextField, TextareaField } from '../../../components/backoffice';
import { ACCOMMODATION_LABELS, ACCOMMODATION_TYPES, Editor, HOTEL_AMENITY_LABELS, SectionProps, opts, profile } from './shared';

type SetFn = (key: string, value: any) => void;

/** Nhận diện khách sạn (tên, loại, mô tả). Dùng ở trang Thông tin và bước 2 onboarding. */
export const ProfileIdentityFields: React.FC<{ v: any; set: SetFn }> = ({ v, set }) => (
  <>
    <TextField
      label="Tên khách sạn"
      required
      maxLength={500}
      value={v.name}
      onChange={(x) => set('name', x)}
    />
    <SelectField
      label="Loại lưu trú"
      value={v.accommodationType}
      options={opts(ACCOMMODATION_TYPES, ACCOMMODATION_LABELS)}
      onChange={(x) => set('accommodationType', x)}
    />
    <TextField
      label="Mô tả ngắn"
      required
      counter
      maxLength={160}
      span
      hint="Hiện trong kết quả tìm kiếm. Nên gọn trong 160 ký tự."
      value={v.summary}
      onChange={(x) => set('summary', x)}
    />
    <TextareaField
      label="Mô tả chi tiết"
      required
      rows={8}
      span
      value={v.description}
      onChange={(x) => set('description', x)}
    />
  </>
);

/** Ô danh sách chữ tự do (dịch vụ) dạng chip: thêm/bỏ, không tự gắn "đã bao gồm". */
const ServiceList: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text || value.includes(text) || value.length >= 30) return;
    onChange([...value, text]);
    setDraft('');
  };
  return (
    <fieldset className="hgbo-checks hgbo-field--span">
      <legend className="hgbo-field__label">Dịch vụ của khách sạn</legend>
      <div className="hgbo-chips">
        {value.filter(Boolean).map((item) => (
          <span key={item} className="hgp-tag">
            {HOTEL_AMENITY_LABELS[item] || item}
            <button type="button" aria-label={`Bỏ dịch vụ ${HOTEL_AMENITY_LABELS[item] || item}`} onClick={() => onChange(value.filter((x) => x !== item))}>
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
        {!value.filter(Boolean).length && <span className="hgbo-small hgbo-muted">Chưa khai báo dịch vụ.</span>}
      </div>
      <div className="hgp-addrow">
        <input
          className="hgbo-input"
          aria-label="Tên dịch vụ mới"
          placeholder="Ví dụ: Giữ hành lý, Đưa đón sân bay (có phí)"
          maxLength={120}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <BoButton icon={Plus} onClick={add} disabled={!draft.trim()}>Thêm</BoButton>
      </div>
      <p className="hgbo-field__hint">Ghi rõ nếu dịch vụ có phí. Dịch vụ tùy chọn không được tính là đã bao gồm trong giá.</p>
    </fieldset>
  );
};

/** Tiện nghi & dịch vụ cấp khách sạn (identity.amenities, profile.services). */
export const HotelAmenityFields: React.FC<{ v: any; set: SetFn }> = ({ v, set }) => {
  const known = Object.keys(HOTEL_AMENITY_LABELS);
  const extra = (v.amenities as string[]).filter((a) => a && !known.includes(a));
  return (
    <>
      <div className="hgbo-field--span">
        <CheckboxGroup
          legend="Tiện nghi chung"
          columns={3}
          options={[...known, ...extra].map((code) => ({ value: code, label: HOTEL_AMENITY_LABELS[code] || code }))}
          value={v.amenities}
          onChange={(x) => set('amenities', x)}
          hint="Áp dụng cho toàn khách sạn (hồ bơi, lễ tân, bãi đỗ xe…). Tiện nghi trong phòng khai báo ở mục Phòng."
        />
      </div>
      <ServiceList value={v.services} onChange={(x) => set('services', x)} />
    </>
  );
};

export const HotelProfileSection: React.FC<SectionProps> = ({ s, write }) => (
  <Editor
    initial={profile(s)}
    save={(v: any) => write('profile', 'put', v)}
  >
    {(v: any, set: SetFn) => (
      <div className="hgbo-stack">
        <FormSection title="Nhận diện" columns={2}>
          <ProfileIdentityFields v={v} set={set} />
        </FormSection>
        <FormSection title="Tiện nghi & dịch vụ khách sạn" description="Áp dụng cho toàn khách sạn. Tiện nghi trong phòng khai báo ở mục Phòng." columns={2}>
          <HotelAmenityFields v={v} set={set} />
        </FormSection>
        <p className="hgbo-small hgbo-muted">Giờ nhận/trả phòng và quy định nằm ở mục Chính sách (cùng hồ sơ, lưu chung một lần gửi).</p>
      </div>
    )}
  </Editor>
);
