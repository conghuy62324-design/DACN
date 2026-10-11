import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
const labels: Record<string, string> = { businesses: 'Cơ sở của tôi', bookings: 'Đơn đặt dịch vụ', inventory: 'Phòng, bàn & sức chứa', calendar: 'Lịch vận hành', reviews: 'Đánh giá', reports: 'Thống kê', settings: 'Thiết lập' };
export const PartnerSectionPage: React.FC = () => {
  const key = useLocation().pathname.split('/').pop() || '';
  return <div className="rounded-3xl border border-dashed border-teal-300 bg-white p-12 text-center"><Construction className="mx-auto h-10 w-10 text-teal-700" /><h1 className="mt-4 text-2xl font-black">{labels[key] || 'Partner Workspace'}</h1><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Phân quyền cơ sở đã được áp dụng. Module vận hành chuyên sâu sẽ được kết nối trong Giai đoạn 3.</p></div>;
};
