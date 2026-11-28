import React, { useCallback, useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck, Ban, RefreshCw, Search } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import { HotelBookingSummary } from '../../components/hotels/HotelBookingSummary';
import {
  Alert,
  AuditList,
  BO_FEATURES,
  BoButton,
  ConfirmDialog,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
  TextField,
  errorMessage,
  fmtDate,
  fmtDateTime,
  fmtNumber,
  fmtVnd,
  paymentLabel,
  statusLabel,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'];
const SERVICE: Record<string, string> = { hotel: 'Lưu trú', tour: 'Tour', restaurant: 'Nhà hàng', ticket: 'Vé' };

const notFound = (error: unknown) => {
  const e = error as any;
  return e?.status === 404 || e?.code === 'BOOKING_NOT_FOUND' || /không tồn tại|không tìm thấy/i.test(String(e?.message || ''));
};

const serviceText = (row: any) => {
  const room = row.hotelStay?.room?.name;
  return (
    <>
      {row.serviceName || row.hotelStay?.hotel?.name || '—'}
      <span className="hgbo-dt__cell-sub">{room ? `Hạng phòng: ${room}` : SERVICE[row.serviceType] || row.serviceType || ''}</span>
    </>
  );
};

const dateRange = (row: any) => {
  const from = row.hotelStay?.quote?.checkIn || row.bookingDate;
  const to = row.hotelStay?.quote?.checkOut || row.returnDate;
  return to ? `${fmtDate(from)} → ${fmtDate(to)}` : fmtDate(from);
};

export const AdminBookingsPage: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { get, set, search: query } = useQueryParams();
  const codeId = useId();
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const limit = [20, 50, 100].includes(Number(get('limit'))) ? Number(get('limit')) : 20;
  const filterStatus = get('status');
  const filterFrom = get('from');
  const filterTo = get('to');
  const [codeInput, setCodeInput] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: Record<string, string> = {};
      if (BO_FEATURES.adminBookingFilters) {
        if (filterStatus) filters.status = filterStatus;
        if (filterFrom) filters.from = filterFrom;
        if (filterTo) filters.to = filterTo;
      }
      const result = await AdminBackofficeService.bookings(page, limit, filters);
      setItems(result.items || []);
      setTotal(result.total ?? 0);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải danh sách booking.'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterStatus, filterFrom, filterTo]);

  const loadDetail = useCallback(async () => {
    if (!code) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    try {
      setDetail(await AdminBackofficeService.bookingByCode(code));
    } catch (requestError) {
      setDetail(null);
      setDetailError(notFound(requestError) ? 'Không tìm thấy booking với mã này.' : errorMessage(requestError, 'Không thể tải booking.'));
    } finally {
      setDetailLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const open = (bookingCode: string) => navigate(`/admin/bookings/${encodeURIComponent(bookingCode)}${query}`);
  const close = () => navigate(`/admin/bookings${query}`);

  const cancel = async (reason?: string) => {
    if (!detail) return;
    await AdminBackofficeService.cancelBooking(detail.id, reason || '');
    toast({ tone: 'success', message: `Đã hủy booking ${detail.bookingCode}.` });
    await Promise.all([loadDetail(), load()]);
  };

  const columns: DataColumn<any>[] = [
    { key: 'bookingCode', header: 'Mã', primary: true, render: (row) => <span className="hgbo-num">{row.bookingCode}</span> },
    {
      key: 'customer',
      header: 'Khách',
      render: (row) => (
        <>
          {row.customerName || '—'}
          {row.customerPhone && <span className="hgbo-dt__cell-sub hgbo-hide-1280">{row.customerPhone}</span>}
        </>
      ),
    },
    { key: 'service', header: 'Dịch vụ/Khách sạn', render: serviceText },
    { key: 'dates', header: 'Ngày', render: (row) => <span className="hgbo-num">{dateRange(row)}</span> },
    { key: 'quantity', header: 'SL', align: 'right', hideBelow: 1024, render: (row) => <span className="hgbo-num">{fmtNumber(row.quantity)}</span> },
    { key: 'totalAmount', header: 'Tổng tiền', align: 'right', render: (row) => <span className="hgbo-num">{fmtVnd(row.totalAmount)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.bookingStatus} domain="booking" /> },
    { key: 'payment', header: 'Thanh toán', hideBelow: 1280, render: (row) => paymentLabel(row.paymentStatus) },
    { key: 'createdAt', header: 'Tạo lúc', hideBelow: 1024, render: (row) => <span className="hgbo-num">{fmtDateTime(row.createdAt)}</span> },
  ];

  const history: any[] = detail?.statusHistory || detail?.history || [];
  const cancellable = detail && ['PENDING', 'CONFIRMED'].includes(detail.bookingStatus);
  const filterCount = (filterStatus ? 1 : 0) + (filterFrom ? 1 : 0) + (filterTo ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Booking toàn hệ thống"
        subtitle="Xem snapshot đơn và xử lý ngoại lệ. Không chỉnh tổng tiền, tồn phòng hay thanh toán."
        actions={<BoButton icon={RefreshCw} loading={loading} onClick={load}>Làm mới</BoButton>}
      />
      <form
        className="hgbo-codebox"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const value = codeInput.trim();
          if (value) open(value);
        }}
      >
        <TextField id={codeId} label="Mã đặt chỗ" value={codeInput} onChange={setCodeInput} placeholder="Nhập mã đặt chỗ" maxLength={64} autoComplete="off" />
        <BoButton type="submit" variant="primary" icon={Search} disabled={!codeInput.trim()}>Tìm</BoButton>
      </form>
      {BO_FEATURES.adminBookingFilters ? (
        <FilterBar
          activeCount={filterCount}
          onReset={() => set({ status: null, from: null, to: null, page: null })}
        >
          <FilterSelect label="Trạng thái" value={filterStatus} onChange={(v) => set({ status: v || null, page: null })} options={BOOKING_STATUSES.map((s) => ({ value: s, label: statusLabel(s, 'booking') }))} />
          <TextField type="date" label="Nhận phòng từ" value={filterFrom} onChange={(v) => set({ from: v || null, page: null })} />
          <TextField type="date" label="Đến" value={filterTo} onChange={(v) => set({ to: v || null, page: null })} />
        </FilterBar>
      ) : (
        <p className="hgbo-note">Bộ lọc sẽ có khi máy chủ hỗ trợ tìm theo trạng thái/ngày. Hiện chỉ tìm theo mã và xem theo trang (mới nhất trước).</p>
      )}
      <DataTable
        caption="Danh sách booking toàn hệ thống"
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ icon: CalendarCheck, title: 'Chưa có booking' }}
        onRowClick={(row) => open(row.bookingCode)}
        selectedKey={detail?.bookingCode === code ? detail?.id : undefined}
        pagination={{ page, limit, total, onChange: (p, l) => set({ page: p > 1 ? p : null, limit: l !== 20 ? l : null }) }}
      />
      <DetailDrawer
        open={!!code}
        onClose={close}
        width="lg"
        title={detail?.bookingCode || code || 'Booking'}
        status={detail?.bookingStatus}
        statusDomain="booking"
        loading={detailLoading}
        error={detailError || null}
        onRetry={loadDetail}
        footer={cancellable ? (
          <BoButton variant="danger" icon={Ban} onClick={() => setCancelOpen(true)}>Hủy đơn (xử lý ngoại lệ)</BoButton>
        ) : undefined}
      >
        {detail && (
          <>
            <DrawerSection title="Tóm tắt">
              {detail.hotelStay ? (
                <HotelBookingSummary booking={detail} />
              ) : (
                <DescList
                  items={[
                    { label: 'Dịch vụ', value: detail.serviceName },
                    { label: 'Loại', value: SERVICE[detail.serviceType] || detail.serviceType },
                    { label: 'Ngày', value: dateRange(detail) },
                    { label: 'Số lượng', value: fmtNumber(detail.quantity) },
                    { label: 'Khách', value: `${fmtNumber(detail.adultsCount)} người lớn · ${fmtNumber(detail.childrenCount)} trẻ em` },
                    { label: 'Ghi chú', value: detail.notes },
                  ]}
                />
              )}
            </DrawerSection>
            <DrawerSection title="Khách & liên hệ">
              <DescList
                items={[
                  { label: 'Họ tên', value: detail.customerName },
                  { label: 'Email', value: detail.customerEmail },
                  { label: 'Điện thoại', value: detail.customerPhone },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Giá chốt lúc đặt (không chỉnh sửa)">
              <DescList
                items={[
                  { label: 'Đơn giá', value: detail.unitPrice !== undefined ? fmtVnd(detail.unitPrice) : null },
                  { label: 'Giảm giá', value: detail.discountAmount ? fmtVnd(detail.discountAmount) : null, hidden: !detail.discountAmount },
                  { label: 'Tổng tiền', value: <span className="hgbo-strong hgbo-num">{fmtVnd(detail.totalAmount)}</span> },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Thanh toán">
              <p>{paymentLabel(detail.paymentStatus)}</p>
            </DrawerSection>
            <DrawerSection title="Lịch sử trạng thái">
              <AuditList
                domain="booking"
                emptyText="Máy chủ chưa trả lịch sử trạng thái cho booking này (cần bổ sung, PAC §8)."
                items={history.map((h) => ({
                  action: h.newStatus ? `BOOKING_${h.newStatus}` : h.action || 'UPDATED',
                  from: h.oldStatus,
                  to: h.newStatus,
                  actorName: h.actorName || h.actor?.fullName,
                  reason: h.reason,
                  at: h.createdAt || h.at,
                }))}
              />
            </DrawerSection>
            {!cancellable && (
              <Alert tone="info">
                <p>Đơn ở trạng thái “{statusLabel(detail.bookingStatus, 'booking')}” không có thao tác quản trị.</p>
              </Alert>
            )}
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={cancelOpen}
        tone="danger"
        title={`Hủy booking ${detail?.bookingCode || ''}?`}
        description="Chỉ dùng để xử lý ngoại lệ."
        impact={(
          <ul>
            <li>Tồn phòng được máy chủ trả lại đúng một lần.</li>
            <li>Hệ thống chưa có thanh toán nên không có hoàn tiền tự động.</li>
          </ul>
        )}
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        reason={{ required: true, label: 'Lý do hủy' }}
        onConfirm={cancel}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
};
