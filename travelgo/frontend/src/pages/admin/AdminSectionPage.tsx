import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

const labels: Record<string, string> = { businesses: 'Cơ sở kinh doanh', bookings: 'Booking toàn hệ thống', users: 'Người dùng', content: 'Tour, Blog & Review', reports: 'Thống kê & báo cáo', settings: 'Cài đặt hệ thống' };
export const AdminSectionPage: React.FC = () => {
  const key = useLocation().pathname.split('/').pop() || '';
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><Construction className="mx-auto h-10 w-10 text-cyan-700" /><h1 className="mt-4 text-2xl font-black">{labels[key] || 'Khu vực quản trị'}</h1><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Route và phân quyền đã sẵn sàng. Chức năng nghiệp vụ chuyên sâu thuộc các giai đoạn tiếp theo của lộ trình.</p></div>;
};
