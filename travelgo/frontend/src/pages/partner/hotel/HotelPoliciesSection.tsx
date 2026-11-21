// Chính sách: cùng endpoint PUT profile và cùng payload profile(s) với trang Thông tin (không mất dữ liệu).
import React from 'react';
import { Link } from 'react-router-dom';
import { FormSection, TextField, TextareaField } from '../../../components/backoffice';
import { Editor, SectionProps, profile } from './shared';

const NOT_PROVIDED = 'Chưa cung cấp';

const POLICY_FIELDS: [string, string, string][] = [
  ['children', 'Trẻ em & giường phụ', 'Ví dụ: Trẻ dưới 6 tuổi ngủ chung giường miễn phí; giường phụ theo yêu cầu, có phí.'],
  ['pets', 'Thú cưng', 'Ví dụ: Không nhận thú cưng.'],
  ['smoking', 'Hút thuốc', 'Ví dụ: Không hút thuốc trong phòng; có khu vực hút thuốc riêng.'],
  ['general', 'Quy định chung', 'Ví dụ: Xuất trình giấy tờ tùy thân khi nhận phòng.'],
];

export const HotelPoliciesSection: React.FC<SectionProps> = ({ s, write, hotelUrl }) => (
  <Editor
    initial={profile(s)}
    save={(v: any) => write('profile', 'put', v)}
  >
    {(v: any, set: (key: string, value: any) => void) => (
      <div className="hgbo-stack">
        <FormSection title="Giờ nhận/trả phòng" columns={2}>
          <TextField label="Giờ nhận phòng" type="time" required value={v.checkInTime} onChange={(x) => set('checkInTime', x)} />
          <TextField label="Giờ trả phòng" type="time" required value={v.checkOutTime} onChange={(x) => set('checkOutTime', x)} />
        </FormSection>
        <FormSection title="Quy định" description="Để trống nghĩa là chưa cung cấp; khách sẽ thấy “Chưa cung cấp”.">
          {POLICY_FIELDS.map(([k, l, hint]) => {
            const raw = v.policies?.[k] ?? '';
            return (
              <TextareaField
                key={k}
                label={l}
                rows={4}
                hint={hint}
                placeholder={NOT_PROVIDED}
                value={raw === NOT_PROVIDED ? '' : raw}
                onChange={(x) => set('policies', { ...v.policies, [k]: x.trim() ? x : NOT_PROVIDED })}
              />
            );
          })}
        </FormSection>
        <p className="hgbo-small hgbo-muted">
          Chính sách hủy cấu hình theo từng gói giá →
          {' '}
          <Link className="hgbo-link" to={`${hotelUrl}/rates`}>Gói giá</Link>
        </p>
      </div>
    )}
  </Editor>
);
