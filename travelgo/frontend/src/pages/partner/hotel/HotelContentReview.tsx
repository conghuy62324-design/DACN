// Admin › Nội dung: hồ sơ, địa chỉ, hạng phòng, chính sách — chỉ đọc. Admin không sửa giá/tồn.
import React from 'react';
import { DescList, StatusPill } from '../../../components/backoffice';
import { ACCOMMODATION_LABELS, HOTEL_AMENITY_LABELS, ROOM_AMENITY_LABELS, SectionProps } from './shared';
import { viewLabel } from './RoomForm';

const POLICY_LABELS: Record<string, string> = { children: 'Trẻ em & giường phụ', pets: 'Thú cưng', smoking: 'Hút thuốc', general: 'Quy định chung' };

const COORD_LABELS: Record<string, string> = { UNKNOWN: 'Chưa có tọa độ', PARTNER_PROVIDED: 'Đối tác cung cấp, chưa xác minh', VERIFIED: 'Đã xác minh' };

const tri = (v: boolean | null | undefined) => (v === true ? 'Có' : v === false ? 'Không' : 'Chưa rõ');

export const HotelContentReview: React.FC<SectionProps> = ({ s }) => (
  <div className="hgbo-stack">
    <section className="hgbo-card">
      <h2 className="hgbo-section-title">Hồ sơ</h2>
      <DescList
        items={[
          { label: 'Tên', value: s.identity.name },
          { label: 'Loại lưu trú', value: ACCOMMODATION_LABELS[s.identity.accommodationType] || s.identity.accommodationType },
          { label: 'Mô tả ngắn', value: s.identity.summary },
          { label: 'Mô tả chi tiết', value: <p className="hgbo-pre">{s.identity.description}</p> },
          { label: 'Tiện nghi chung', value: (s.identity.amenities || []).map((a: string) => HOTEL_AMENITY_LABELS[a] || a).join(', ') },
          { label: 'Dịch vụ', value: (s.profile?.services || []).map((a: string) => HOTEL_AMENITY_LABELS[a] || a).join(', ') },
        ]}
      />
    </section>
    <section className="hgbo-card">
      <h2 className="hgbo-section-title">Địa chỉ</h2>
      <DescList
        items={[
          { label: 'Địa chỉ', value: s.address?.fullAddress },
          { label: 'Tọa độ', value: s.address ? `${s.address.latitude ?? 'chưa rõ'}, ${s.address.longitude ?? 'chưa rõ'}` : undefined },
          { label: 'Tình trạng tọa độ', value: COORD_LABELS[s.address?.coordinateStatus] || s.address?.coordinateStatus },
          { label: 'Nguồn', value: s.address?.source },
        ]}
      />
    </section>
    <section className="hgbo-card">
      <h2 className="hgbo-section-title">Hạng phòng ({s.rooms.length})</h2>
      {s.rooms.length === 0 ? (
        <p className="hgbo-muted">Chưa có hạng phòng.</p>
      ) : (
        <ul className="hgp-reviewlist">
          {s.rooms.map((r: any) => (
            <li key={r.id}>
              <div className="hgbo-section-head">
                <h3 className="hgp-h3">{r.name}</h3>
                <StatusPill status={r.status} domain="room" size="sm" />
              </div>
              <p className="hgbo-small hgbo-muted">
                {r.areaM2 ?? 'Chưa rõ'} m² · tối đa {r.maxOccupancy} khách · {viewLabel(r.view)} · ban công: {tri(r.balcony)} · cửa sổ: {tri(r.hasWindow)}
              </p>
              <p className="hgbo-pre">{r.description}</p>
              <p className="hgbo-small">Tiện nghi phòng: {(r.amenities || []).map((a: string) => ROOM_AMENITY_LABELS[a] || a).join(', ') || '—'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
    <section className="hgbo-card">
      <h2 className="hgbo-section-title">Chính sách</h2>
      <DescList
        items={[
          { label: 'Nhận phòng', value: s.profile?.checkInTime?.slice(0, 5) },
          { label: 'Trả phòng', value: s.profile?.checkOutTime?.slice(0, 5) },
          ...Object.entries(s.profile?.policies || {}).map(([k, v]: any) => ({ label: POLICY_LABELS[k] || k, value: v })),
        ]}
      />
      <p className="hgbo-small hgbo-muted hgp-mt">Giá và tồn phòng do đối tác quản lý; quản trị không tự sửa phân bổ.</p>
    </section>
  </div>
);
