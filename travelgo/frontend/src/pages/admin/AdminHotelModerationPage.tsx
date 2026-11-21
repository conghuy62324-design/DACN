import React from 'react';
import HotelManagementPage from '../partner/HotelManagementPage';
import { PageHeader, useBackofficeBreadcrumbs } from '../../components/backoffice';

// Gói F sở hữu toàn bộ phần bên trong HotelManagementPage (nhánh admin).
// Prop `embedded` do Gói F thêm; truyền qua kiểu mở rộng để chạy được cả trước khi prop có trong file của F
// (React bỏ qua prop chưa dùng, nên hành vi hiện tại không đổi).
const EmbeddedHotelManagement = HotelManagementPage as unknown as React.ComponentType<{ admin?: boolean; embedded?: boolean }>;

export const AdminHotelModerationPage: React.FC = () => {
  useBackofficeBreadcrumbs([{ label: 'Kiểm duyệt' }, { label: 'Khách sạn', to: '/admin/hotels' }]);
  return (
    <div>
      <PageHeader
        title="Kiểm duyệt khách sạn"
        subtitle="Duyệt đúng phiên bản nội dung. Giá và tồn phòng do đối tác quản lý."
      />
      <EmbeddedHotelManagement admin embedded />
    </div>
  );
};
