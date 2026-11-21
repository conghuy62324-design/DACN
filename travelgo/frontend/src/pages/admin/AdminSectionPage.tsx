import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/backoffice';

// Chốt dự phòng cho route /admin/:section chưa có trang riêng.
const labels: Record<string, string> = { content: 'Tour, Blog & Review', reports: 'Thống kê & báo cáo' };

export const AdminSectionPage: React.FC = () => {
  const key = useLocation().pathname.split('/').pop() || '';
  const title = labels[key] || 'Khu vực quản trị';
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Chức năng chưa có"
        description="Mục này chưa có API được duyệt nên chưa có giao diện. Không có dữ liệu để hiển thị."
      />
    </div>
  );
};
