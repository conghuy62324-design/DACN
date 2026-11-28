// Đơn đặt của cơ sở. Giữ ManagementService.partnerBookings / partnerBooking / partnerBookingStatus.
// Hành động theo lifecycle hiện có: PENDING → CONFIRMED | REJECTED, CONFIRMED → COMPLETED. Không sửa tổng tiền/thanh toán/phân bổ.
import { HotelBookingSummary } from '../../components/hotels/HotelBookingSummary';
import '../../styles/hotels.css';
import '../../styles/hotelStay.css';
import '../../styles/hg-partner.css';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import {
  Alert,
  AuditList,
  BoButton,
  BoTabs,
  ConfirmDialog,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  PageHeader,
  StatusPill,
  errorMessage,
  fmtDate,
  fmtDateTime,
  fmtVnd,
  paymentLabel,
  statusLabel,
  useQueryParams,
} from '../../components/backoffice';
import { ManagementService } from '../../services/managementService';
import { PlatformService } from '../../services/platformService';
import { Booking, Business } from '../../types';
import { usePartnerHotels } from './hotel/partnerContext';

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

const TABS = [
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CLOSED', label: 'Đã hủy/Từ chối' },
  { key: '', label: 'Tất cả' },
];

export const PartnerBookingsPage: React.FC = () => {
  const bookingId = useParams().id;
  const navigate = useNavigate();
  const query = useQueryParams();
  const ctx = usePartnerHotels();
  const [search, setSearch] = useState(query.get('q'));
  const filterStatus = query.get('status');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'' | 'REJECTED' | 'COMPLETED'>('');

  const load = async (id = businessId, status = filterStatus, text = search) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      if (status === 'CLOSED') {
        const [a, b] = await Promise.all(['CANCELLED', 'REJECTED'].map((st) => ManagementService.partnerBookings(id, { search: text, status: st, limit: 100 })));
        setItems([...(a.items as Booking[]), ...(b.items as Booking[])].sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt))));
      } else {
        setItems((await ManagementService.partnerBookings(id, { search: text, status, limit: 100 })).items as Booking[]);
      }
    } catch (e: any) {
      setError(errorMessage(e, 'Không thể tải booking.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    PlatformService.getPartnerDashboard()
      .then(async (d) => {
        setBusinesses(d.businesses);
        const hotel = ctx?.current;
        const byHotel = hotel ? d.businesses.find((b) => (hotel.businessId ? b.id === hotel.businessId : b.name === hotel.businessName)) : undefined;
        const id = byHotel?.id || d.selectedBusiness?.id || '';
        setBusinessId(id);
        if (id) await load(id);
        else setLoading(false);
      })
      .catch((e) => {
        setError(errorMessage(e, 'Không thể tải cơ sở.'));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setSelected(null);
      return;
    }
    const inList = items.find((b) => b.id === bookingId);
    if (inList) setSelected(inList);
    setDetailLoading(!inList);
    setDetailError('');
    ManagementService.partnerBooking(bookingId)
      .then((b) => setSelected(b))
      .catch((e) => setDetailError(errorMessage(e, 'Không tải được đơn đặt.')))
      .finally(() => setDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const closeDrawer = () => navigate('/partner/bookings' + query.search);
  const openBooking = (b: Booking) => navigate(`/partner/bookings/${b.id}${query.search}`);

  const status = async (booking: Booking, next: string, reason?: string) => {
    setBusy(true);
    try {
      await ManagementService.partnerBookingStatus(booking.id, businessId, next, reason);
      closeDrawer();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const confirmNow = async (booking: Booking) => {
    setDetailError('');
    try {
      await status(booking, 'CONFIRMED');
    } catch (e: any) {
      setDetailError(errorMessage(e, 'Không thể cập nhật booking.'));
    }
  };

  const setStatusFilter = (value: string) => {
    query.set({ status: value });
    void load(businessId, value);
  };

  const columns: DataColumn<Booking>[] = useMemo(() => [
    {
      key: 'code',
      header: 'Mã / Khách',
      primary: true,
      render: (b) => (
        <div className="hgp-cellstack">
          <span className="hgbo-strong hgbo-num">{b.bookingCode}</span>
          <span className="hgbo-dt__cell-sub">{b.customerName}</span>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Dịch vụ',
      render: (b) => (
        <div className="hgp-cellstack">
          <span>{b.serviceName}</span>
          {b.hotelStay?.room?.name && <span className="hgbo-dt__cell-sub">{b.hotelStay.room.name}</span>}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Nhận → trả phòng',
      render: (b) => (b.returnDate ? `${fmtDate(b.bookingDate)} → ${fmtDate(b.returnDate)}` : fmtDate(b.bookingDate)),
    },
    {
      key: 'qty',
      header: 'Số lượng',
      hideBelow: 1280,
      render: (b) => `${b.quantity} ${b.hotelStay ? 'phòng' : 'khách/vé'}`,
    },
    { key: 'total', header: 'Tổng tiền', align: 'right', hideBelow: 1024, render: (b) => <span className="hgbo-num">{fmtVnd(b.totalAmount)}</span> },
    { key: 'status', header: 'Trạng thái', render: (b) => <StatusPill status={b.bookingStatus} domain="booking" size="sm" /> },
  ], []);

  const history = (selected as any)?.statusHistory;

  const footer = selected && !detailLoading ? (
    selected.bookingStatus === 'PENDING' ? (
      <>
        <BoButton variant="danger" icon={XCircle} disabled={busy} onClick={() => setDialog('REJECTED')}>Từ chối</BoButton>
        <BoButton variant="primary" icon={CheckCircle2} loading={busy} onClick={() => confirmNow(selected)}>Xác nhận đơn</BoButton>
      </>
    ) : selected.bookingStatus === 'CONFIRMED' ? (
      <BoButton variant="primary" icon={CheckCircle2} disabled={busy} onClick={() => setDialog('COMPLETED')}>Đánh dấu hoàn thành</BoButton>
    ) : undefined
  ) : undefined;

  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title="Đơn đặt"
        subtitle="Chỉ gồm đơn của cơ sở bạn được cấp quyền. Tổng tiền là giá chốt lúc đặt, không chỉnh sửa."
        actions={businesses.length ? (
          <div className="hgbo-field hgp-bizselect">
            <label className="hgbo-field__label" htmlFor="hgp-bookings-business">Cơ sở kinh doanh</label>
            <select
              id="hgp-bookings-business"
              className="hgbo-select"
              value={businessId}
              onChange={(e) => {
                setBusinessId(e.target.value);
                void load(e.target.value);
              }}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : undefined}
      />
      <BoTabs
        items={TABS.map((t) => ({ key: t.key || 'ALL', label: t.label }))}
        value={filterStatus === 'CANCELLED' || filterStatus === 'REJECTED' ? 'CLOSED' : filterStatus || 'ALL'}
        onChange={(key) => setStatusFilter(key === 'ALL' ? '' : key)}
        label="Lọc nhanh theo trạng thái"
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm mã, khách hoặc khách sạn', label: 'Tìm booking', maxLength: 120 }}
        activeCount={(filterStatus ? 1 : 0) + (search.trim() ? 1 : 0)}
        onSubmit={() => {
          query.set({ q: search.trim() });
          void load();
        }}
        onReset={() => {
          setSearch('');
          query.set({ q: null, status: null });
          void load(businessId, '', '');
        }}
        note="Nhấn Enter để tìm trên máy chủ."
      >
        <div className="hgbo-field">
          <label className="hgbo-field__label" htmlFor="hgp-booking-status">Trạng thái</label>
          <select
            id="hgp-booking-status"
            className="hgbo-select"
            aria-label="Lọc trạng thái booking"
            value={filterStatus === 'CLOSED' ? '' : filterStatus}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{statusLabel(st, 'booking')}</option>
            ))}
          </select>
        </div>
      </FilterBar>
      {error && <Alert tone="danger">{error}</Alert>}
      <DataTable
        caption="Danh sách đơn đặt"
        columns={columns}
        rows={items}
        rowKey={(b) => b.id}
        loading={loading}
        onRowClick={openBooking}
        selectedKey={bookingId || null}
        rowActions={(b) => [{ label: 'Xem', onClick: () => openBooking(b) }]}
        empty={{
          icon: ClipboardList,
          title: businessId ? 'Chưa có đơn đặt phù hợp' : 'Chưa có cơ sở được cấp quyền',
          description: businessId ? 'Thử bỏ bộ lọc hoặc chọn cơ sở khác.' : 'Liên hệ quản trị viên nếu hồ sơ của bạn đã được phê duyệt.',
        }}
      />
      <DetailDrawer
        open={!!bookingId}
        width="lg"
        title={selected?.bookingCode || 'Đơn đặt'}
        subtitle={selected?.serviceName}
        status={selected?.bookingStatus}
        statusDomain="booking"
        loading={detailLoading && !selected}
        error={!selected ? detailError || null : null}
        onClose={closeDrawer}
        footer={footer}
      >
        {selected && (
          <div className="hgbo-stack">
            {detailError && <Alert tone="danger">{detailError}</Alert>}
            {selected.hotelStay ? (
              <HotelBookingSummary booking={selected} partner />
            ) : (
              <DrawerSection title="Dịch vụ">
                <DescList
                  items={[
                    { label: 'Dịch vụ', value: selected.serviceName },
                    { label: 'Ngày dùng', value: fmtDate(selected.bookingDate) },
                    { label: 'Số lượng', value: selected.quantity },
                  ]}
                />
              </DrawerSection>
            )}
            <DrawerSection title="Khách & liên hệ">
              <DescList
                items={[
                  { label: 'Khách hàng', value: selected.customerName },
                  { label: 'Điện thoại', value: selected.customerPhone },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Giá & thanh toán">
              <DescList
                items={[
                  { label: 'Tổng tiền (giá chốt lúc đặt)', value: <span className="hgbo-num">{fmtVnd(selected.totalAmount)}</span> },
                  { label: 'Thanh toán', value: paymentLabel(selected.paymentStatus) },
                  { label: 'Tạo lúc', value: fmtDateTime(selected.createdAt) },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Lịch sử trạng thái">
              <AuditList
                domain="booking"
                items={Array.isArray(history) ? history.map((h: any) => ({ action: h.action || 'BOOKING_' + (h.to || h.status || ''), actorName: h.actorName, at: h.at || h.createdAt, reason: h.reason, from: h.from, to: h.to })) : null}
                emptyText="Máy chủ chưa trả lịch sử trạng thái cho đơn này."
              />
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={dialog === 'REJECTED'}
        title="Từ chối đơn đặt"
        tone="danger"
        impact="Phòng giữ cho đơn được trả lại."
        confirmLabel="Từ chối đơn"
        reason={{ required: true, label: 'Lý do từ chối', presets: ['Hết phòng trong khoảng ngày này', 'Thông tin đặt chỗ chưa hợp lệ'] }}
        onClose={() => setDialog('')}
        onConfirm={async (reason) => {
          if (selected) await status(selected, 'REJECTED', reason);
        }}
      />
      <ConfirmDialog
        open={dialog === 'COMPLETED'}
        title="Đánh dấu hoàn thành"
        impact="Chỉ hợp lệ sau ngày trả phòng; máy chủ sẽ từ chối nếu chưa đến hạn."
        confirmLabel="Đánh dấu hoàn thành"
        onClose={() => setDialog('')}
        onConfirm={async () => {
          if (selected) await status(selected, 'COMPLETED');
        }}
      />
    </div>
  );
};
