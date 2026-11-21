import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/backoffice';

const labels: Record<string, string> = { businesses: 'Cơ sở của tôi', bookings: 'Đơn đặt dịch vụ', inventory: 'Phòng, bàn & sức chứa', calendar: 'Lịch vận hành', reviews: 'Đánh giá', reports: 'Thống kê', settings: 'Thiết lập' };

export const PartnerSectionPage: React.FC = () => {
  const key = useLocation().pathname.split('/').pop() || '';
  const title = labels[key] || 'Kênh đối tác';
  return (
    <div className="hgbo-stack">
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Chức năng chưa được kết nối"
        description="Phân quyền cơ sở đã được áp dụng. Module vận hành chuyên sâu sẽ được kết nối ở giai đoạn sau."
      />
    </div>
  );
};
