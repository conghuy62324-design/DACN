import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  BookOpen,
  Building2,
  CalendarCheck,
  FileCheck2,
  Languages,
  LayoutDashboard,
  LayoutTemplate,
  MapPinned,
  MessageSquareWarning,
  Newspaper,
  Route,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import { BackofficeShell, NavGroup } from '../components/backoffice';
import { AdminDashboardData, PlatformService } from '../services/platformService';

type Badges = Partial<Pick<AdminDashboardData, 'pendingPartners' | 'pendingPlaces' | 'pendingTours' | 'pendingBlogs' | 'pendingBookings'>>;

const hotelDomainEnabled = import.meta.env.VITE_HOTEL_DOMAIN_ENABLED === 'true';

export const AdminLayout: React.FC = () => {
  const [badges, setBadges] = useState<Badges>({});

  useEffect(() => {
    let live = true;
    // Một lần khi layout mount. Lỗi thì không hiện badge, không chặn layout.
    PlatformService.getAdminDashboard()
      .then((data) => {
        if (live && data) setBadges(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const nav = useMemo<NavGroup[]>(() => [
    {
      items: [
        { to: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'Đối tác',
      items: [
        { to: '/admin/partner-applications', label: 'Hồ sơ đối tác', icon: FileCheck2, badge: badges.pendingPartners },
        { to: '/admin/businesses', label: 'Cơ sở kinh doanh', icon: Store },
      ],
    },
    {
      label: 'Kiểm duyệt',
      items: [
        { to: '/admin/hotels', label: 'Khách sạn', icon: Building2, hidden: !hotelDomainEnabled },
        { to: '/admin/places', label: 'Địa điểm', icon: MapPinned, badge: badges.pendingPlaces },
        { to: '/admin/tours', label: 'Tour', icon: Route, badge: badges.pendingTours },
        { to: '/admin/blogs', label: 'Bài viết', icon: Newspaper, badge: badges.pendingBlogs },
        { to: '/admin/reviews', label: 'Đánh giá & báo cáo', icon: MessageSquareWarning },
      ],
    },
    {
      label: 'Vận hành',
      items: [
        { to: '/admin/bookings', label: 'Booking toàn hệ thống', icon: CalendarCheck, badge: badges.pendingBookings },
        { to: '/admin/users', label: 'Người dùng & vai trò', icon: Users },
      ],
    },
    {
      label: 'Nội dung website',
      items: [
        { to: '/admin/cms', label: 'CMS trang chủ', icon: LayoutTemplate },
        { to: '/admin/promotions', label: 'Ưu đãi', icon: BadgePercent },
      ],
    },
    {
      label: 'Hệ thống',
      items: [
        { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
      ],
    },
    {
      label: 'Trí tuệ nhân tạo',
      items: [
        { to: '/admin/travel-web', label: 'Nguồn web & kiến thức', icon: BookOpen },
        { to: '/admin/language-lexicon', label: 'Từ điển tiếng Việt', icon: Languages },
      ],
    },
  ], [badges]);

  return (
    <BackofficeShell
      area="admin"
      brandSubtitle="Quản trị hệ thống"
      roleLabel="Quản trị viên"
      nav={nav}
    />
  );
};
