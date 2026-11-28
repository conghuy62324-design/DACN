import React from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, BedDouble, Images, Tags } from 'lucide-react';
import { Alert, DescList, KpiTile } from '../../../components/backoffice';
import { ACCOMMODATION_LABELS, SectionProps } from './shared';

export const HotelOverviewSection: React.FC<SectionProps> = ({ s, admin, hotelUrl }) => {
  const tiles = [
    { label: 'Hạng phòng', value: s.rooms.length, icon: BedDouble, to: admin ? `${hotelUrl}/content` : `${hotelUrl}/rooms` },
    { label: 'Gói giá', value: s.rates.length, icon: Tags, to: admin ? undefined : `${hotelUrl}/rates` },
    { label: 'Ảnh đã tải', value: s.media.length, icon: Images, to: `${hotelUrl}/media` },
    { label: 'Ưu đãi', value: s.promotions.length, icon: BadgePercent, to: admin ? undefined : `${hotelUrl}/promotions` },
  ];
  return (
    <div className="hgbo-stack">
      <section className="hgbo-card">
        <h2 className="hgbo-section-title">{s.identity.name}</h2>
        {s.identity.summary && <p className="hgp-lead">{s.identity.summary}</p>}
        <DescList
          items={[
            { label: 'Loại lưu trú', value: ACCOMMODATION_LABELS[s.identity.accommodationType] || s.identity.accommodationType },
            { label: 'Địa chỉ', value: s.address?.fullAddress || 'Chưa có địa chỉ' },
            { label: 'Doanh nghiệp', value: s.owner?.business?.name, hidden: !admin || !s.owner },
            { label: 'Người đại diện', value: s.owner?.representatives?.map((u: any) => u.full_name).join(', '), hidden: !admin || !s.owner },
          ]}
        />
        {!admin && (
          <p className="hgbo-small hgbo-muted hgp-mt">
            <Link className="hgbo-link" to={`${hotelUrl}/profile`}>Sửa thông tin</Link>
            {' · '}
            <Link className="hgbo-link" to={`${hotelUrl}/address`}>Sửa địa chỉ</Link>
            {' · '}
            <Link className="hgbo-link" to={`${hotelUrl}/review-status`}>Trạng thái duyệt</Link>
          </p>
        )}
      </section>
      <div className="hgbo-kpis">
        {tiles.map((tile) => (
          <KpiTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            href={tile.to}
          />
        ))}
      </div>
      <Alert tone="info">
        <p>Chưa hỗ trợ đặt phòng theo hợp đồng mới. Giá tham khảo không xác nhận Booking hoặc giữ phòng.</p>
      </Alert>
    </div>
  );
};
