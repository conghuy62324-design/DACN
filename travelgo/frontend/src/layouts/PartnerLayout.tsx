import React from 'react';
import {
  BadgePercent,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardList,
  Images,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Newspaper,
  Route,
  ScrollText,
  Ticket,
} from 'lucide-react';
import { BackofficeShell, NavGroup } from '../components/backoffice';
import { PartnerHotelsProvider, usePartnerHotels } from '../pages/partner/hotel/partnerContext';
import { PropertySwitcher } from '../pages/partner/hotel/PropertySwitcher';
import { PlatformService } from '../services/platformService';
import '../styles/hg-partner.css';

/** Badge "Đơn đặt" = pendingBookings của Business đang chọn ở dashboard (lỗi thì không hiện). */
function usePendingBookings() {
  const [count, setCount] = React.useState<number | undefined>(undefined);
  React.useEffect(() => {
    let live = true;
    PlatformService.getPartnerDashboard()
      .then((d) => {
        if (live) setCount(d.metrics?.pendingBookings ?? undefined);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return count;
}

const PartnerShell: React.FC = () => {
  const ctx = usePartnerHotels();
  const pending = usePendingBookings();
  const hotelOn = !!ctx?.enabled;
  const id = ctx?.currentHotelId;
  // Chưa chọn khách sạn: các mục nhóm "Khách sạn" dẫn về danh sách /partner/hotels.
  const hotel = (section: string) => (id ? `/partner/hotels/${id}/${section}` : '/partner/hotels');
  const noHotel = hotelOn && !id;

  const nav: NavGroup[] = [
    { items: [{ to: '/partner', label: 'Tổng quan', icon: LayoutDashboard, end: true }] },
    {
      label: 'Khách sạn',
      items: [
        { to: id ? `/partner/hotels/${id}/overview` : '/partner/hotels', label: 'Cơ sở', icon: Building2, hidden: !hotelOn, end: noHotel, activeOn: id ? ['profile', 'address', 'review-status'].map((x) => '/partner/hotels/' + id + '/' + x) : undefined },
        { to: hotel('media'), label: 'Hình ảnh', icon: Images, hidden: !hotelOn || noHotel },
        { to: hotel('rooms'), label: 'Phòng', icon: BedDouble, hidden: !hotelOn || noHotel },
        { to: hotel('calendar'), label: 'Giá & tồn phòng', icon: CalendarRange, hidden: !hotelOn || noHotel },
        { to: hotel('promotions'), label: 'Ưu đãi', icon: BadgePercent, hidden: !hotelOn || noHotel },
      ],
    },
    {
      label: 'Vận hành',
      items: [
        { to: '/partner/bookings', label: 'Đơn đặt', icon: ClipboardList, badge: pending },
        { to: '/partner/reviews', label: 'Đánh giá', icon: MessageSquare },
        // Chính sách đặt sau Đánh giá theo đúng thứ tự bàn giao 7.2 (quyết định 6.1.6).
        { to: hotel('policies'), label: 'Chính sách', icon: ScrollText, hidden: !hotelOn || noHotel },
      ],
    },
    {
      label: 'Dịch vụ khác',
      items: [
        { to: '/partner/places', label: 'Địa điểm khác', icon: MapPinned },
        { to: '/partner/tours', label: 'Tour', icon: Route },
        { to: '/partner/tickets', label: 'Vé', icon: Ticket },
        { to: '/partner/blogs', label: 'Bài viết', icon: Newspaper },
      ],
    },
  ];

  return (
    <BackofficeShell
      area="partner"
      brandSubtitle="Kênh đối tác"
      roleLabel="Đối tác"
      nav={nav}
      topbarSlot={hotelOn ? <PropertySwitcher /> : undefined}
    />
  );
};

export const PartnerLayout: React.FC = () => (
  <PartnerHotelsProvider>
    <PartnerShell />
  </PartnerHotelsProvider>
);
