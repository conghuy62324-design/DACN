// Quản lý khách sạn (Partner) / Kiểm duyệt khách sạn (Admin, nhúng trong AdminHotelModerationPage).
// File này vẫn là NƠI DUY NHẤT giữ state và gọi API quản lý khách sạn (load, write, act, If-Match: s.revision).
// Các trang con trong ./hotel/* chỉ trình bày và nhận { s, write, act, load, admin, base }.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Building2, ChevronLeft, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import {
  Alert,
  BoButton,
  BoLinkButton,
  BoTabs,
  ConflictBanner,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
  isConflictError,
  useBackofficeBreadcrumbs,
  useToast,
} from '../../components/backoffice';
import '../../styles/hg-partner.css';
import { SectionProps, WriteOptions } from './hotel/shared';
import { usePartnerHotels } from './hotel/partnerContext';
import { HotelListView } from './hotel/HotelListView';
import { HotelOverviewSection } from './hotel/HotelOverviewSection';
import { HotelProfileSection } from './hotel/HotelProfileSection';
import { HotelAddressSection } from './hotel/HotelAddressSection';
import { HotelReviewStatusSection } from './hotel/HotelReviewStatusSection';
import { HotelMediaSection } from './hotel/HotelMediaSection';
import { HotelRoomsSection } from './hotel/HotelRoomsSection';
import { HotelRatesSection } from './hotel/HotelRatesSection';
import { PriceInventoryCalendar } from './hotel/PriceInventoryCalendar';
import { HotelPromotionsSection } from './hotel/HotelPromotionsSection';
import { HotelPoliciesSection } from './hotel/HotelPoliciesSection';
import { HotelContentReview } from './hotel/HotelContentReview';

type Group = { key: string; title: string; tabs?: { key: string; label: string }[] };

const PARTNER_GROUPS: Record<string, Group> = {
  overview: { key: 'facility', title: 'Cơ sở' },
  profile: { key: 'facility', title: 'Cơ sở' },
  address: { key: 'facility', title: 'Cơ sở' },
  'review-status': { key: 'facility', title: 'Cơ sở' },
  media: { key: 'media', title: 'Hình ảnh' },
  rooms: { key: 'rooms', title: 'Phòng' },
  calendar: { key: 'pricing', title: 'Giá & tồn phòng' },
  rates: { key: 'pricing', title: 'Giá & tồn phòng' },
  promotions: { key: 'promotions', title: 'Ưu đãi' },
  policies: { key: 'policies', title: 'Chính sách' },
};

const FACILITY_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'profile', label: 'Thông tin' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'review-status', label: 'Trạng thái duyệt' },
];

const PRICING_TABS = [
  { key: 'calendar', label: 'Lịch tháng' },
  { key: 'rates', label: 'Gói giá' },
];

const ADMIN_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'content', label: 'Nội dung' },
  { key: 'media', label: 'Hình ảnh' },
  { key: 'review-status', label: 'Quyết định & lịch sử' },
];

const PARTNER_SECTIONS = Object.keys(PARTNER_GROUPS);
const ADMIN_SECTIONS = ADMIN_TABS.map((tab) => tab.key);

/**
 * State + lời gọi API quản lý khách sạn (giữ nguyên từ bản cũ: cùng endpoint, payload, If-Match/revision và thông báo lỗi).
 * Dùng chung cho HotelManagementPage và PartnerHotelOnboardingPage để không có nơi thứ hai gọi API ghi.
 */
export function useManagedHotel(admin = false) {
  const base = `/${admin ? 'admin' : 'partner'}/hotels`;
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [s, setS] = useState<any>(null);
  const sRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [business, setBusiness] = useState<any[]>([]);
  const [businessLoaded, setBusinessLoaded] = useState(admin);
  const { toast } = useToast();
  const partnerHotels = usePartnerHotels();

  const loadList = useCallback(async () => {
    const r: any = await api.get(base);
    setList(r.data);
    return r.data;
  }, [base]);

  useEffect(() => {
    setListLoading(true);
    loadList()
      .catch((e: any) => setError(e.message || 'Chưa tải được module'))
      .finally(() => setListLoading(false));
    if (!admin) {
      api
        .get('/partner/businesses')
        .then((r: any) => setBusiness(Array.isArray(r.data) ? r.data : r.data?.items || []))
        .catch(() => {})
        .finally(() => setBusinessLoaded(true));
    }
  }, [admin, loadList]);

  const load = useCallback(async (id: string) => {
    setError('');
    setConflict(false);
    const r: any = await api.get(base + '/' + id);
    sRef.current = r.data;
    setS(r.data);
    return r.data;
  }, [base]);

  const write = useCallback(async (path: string, method = 'put', body: any = {}, options: WriteOptions = {}) => {
    const current = sRef.current;
    try {
      setError('');
      const r: any = await (api as any)[method](base + '/' + current.identity.id + '/' + path, body, { headers: { 'If-Match': String(current.revision) } });
      await load(current.identity.id);
      await loadList();
      partnerHotels?.reload();
      toast({ tone: 'success', message: options.success || 'Đã lưu vào hệ thống.' });
      return r;
    } catch (e: any) {
      setError(e.message || e.error?.message || 'Không thể lưu. Dữ liệu có thể đã thay đổi; hãy tải lại.');
      if (isConflictError(e)) setConflict(true);
      throw e;
    }
  }, [base, load, loadList, partnerHotels, toast]);

  const act = useCallback((path: string, method?: string, body?: any) => {
    void write(path, method, body).catch(() => {});
  }, [write]);

  /** Tải 1 ảnh (octet-stream + If-Match) rồi load() để có revision mới trước ảnh kế tiếp. Lỗi ném ra cho hàng chờ hiển thị. */
  const uploadMedia = useCallback(async (file: File, meta: { rights: string; altText: string; roomTypeId?: string }) => {
    const current = sRef.current;
    const params = new URLSearchParams({ rights: meta.rights, altText: meta.altText, ...(meta.roomTypeId ? { roomTypeId: meta.roomTypeId } : {}) });
    await api.post(base + '/' + current.identity.id + '/media?' + params, file, { headers: { 'Content-Type': 'application/octet-stream', 'If-Match': String(current.revision) } });
    await load(current.identity.id);
    await loadList();
  }, [base, load, loadList]);

  /** Tạo bản nháp (POST /partner/hotels) như form "Tạo khách sạn nháp" cũ. */
  const createHotel = useCallback(async (v: any, clean: (a: any) => any) => {
    const r: any = await api.post(base, { ...v, address: clean(v.address) });
    await loadList();
    partnerHotels?.reload();
    return load(r.data.identity.id);
  }, [base, load, loadList, partnerHotels]);

  return { base, list, listLoading, s, setS, error, setError, conflict, business, businessLoaded, load, loadList, write, act, uploadMedia, createHotel };
}

const HotelStatusBar: React.FC<{ s: any; onReload: () => void; reloading: boolean }> = ({ s, onReload, reloading }) => (
  <div className="hgp-statusbar" role="group" aria-label="Tình trạng dữ liệu khách sạn">
    <StatusPill status={s.authority.placeStatus} domain="moderation" size="sm" />
    <span>Nội dung v{s.authority.contentVersion}</span>
    <span>{s.authority.approvedContentVersion == null ? 'Chưa duyệt' : `Đã duyệt v${s.authority.approvedContentVersion}`}</span>
    <span>Giá/tồn v{s.authority.commercialVersion}</span>
    <BoButton variant="ghost" size="sm" icon={RefreshCw} loading={reloading} onClick={onReload} className="hgp-statusbar__reload">
      Tải lại dữ liệu
    </BoButton>
  </div>
);

function HotelManagementEnabled({ admin = false, embedded = false }: { admin?: boolean; embedded?: boolean }) {
  const { hotelId, section } = useParams();
  const navigate = useNavigate();
  const m = useManagedHotel(admin);
  const { s, load, base } = m;
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const partnerHotels = usePartnerHotels();

  const fetchHotel = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError('');
    try {
      await load(id);
    } catch (e: any) {
      setLoadError(e?.message || 'Không tải được dữ liệu khách sạn.');
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (hotelId) void fetchHotel(hotelId);
  }, [hotelId, fetchHotel]);

  useEffect(() => {
    if (!admin && hotelId) partnerHotels?.remember(hotelId);
  }, [admin, hotelId, partnerHotels]);

  const valid = admin ? ADMIN_SECTIONS : PARTNER_SECTIONS;
  const current = s && hotelId && s.identity.id === hotelId ? s : null;
  const group = !admin && section ? PARTNER_GROUPS[section] : undefined;
  const crumbTitle = admin ? 'Kiểm duyệt khách sạn' : group?.title || 'Khách sạn';

  useBackofficeBreadcrumbs(
    embedded
      ? null
      : hotelId
        ? [{ label: 'Khách sạn', to: base }, { label: current?.identity.name || '…', to: `${base}/${hotelId}/overview` }, { label: crumbTitle }]
        : [{ label: 'Khách sạn' }],
  );

  if (!hotelId) {
    return (
      <HotelListView
        admin={admin}
        embedded={embedded}
        base={base}
        list={m.list}
        loading={m.listLoading}
        error={m.error}
        onRetry={() => {
          m.setError('');
          void m.loadList().catch((e: any) => m.setError(e.message || 'Chưa tải được module'));
        }}
      />
    );
  }

  if (!section || !valid.includes(section)) return <Navigate to={`${base}/${hotelId}/overview`} replace />;

  const hotelUrl = `${base}/${hotelId}`;
  const tabsFor = admin ? ADMIN_TABS : group?.key === 'facility' ? FACILITY_TABS : group?.key === 'pricing' ? PRICING_TABS : null;
  const tabItems = tabsFor?.map((tab) => ({ key: tab.key, label: tab.label, to: `${hotelUrl}/${tab.key}` }));
  const title = admin ? current?.identity.name || 'Khách sạn' : group?.title || 'Khách sạn';

  const header = embedded ? (
    <div className="hgp-subhead">
      <BoLinkButton variant="ghost" size="sm" icon={ChevronLeft} to={base}>
        Danh sách khách sạn
      </BoLinkButton>
      <h2 className="hgp-subhead__title">{current?.identity.name || 'Đang tải khách sạn…'}</h2>
      {tabItems && <BoTabs items={tabItems} value={section} label="Các phần kiểm duyệt khách sạn" />}
    </div>
  ) : (
    <PageHeader
      title={title}
      subtitle={admin ? 'Duyệt đúng phiên bản nội dung. Giá và tồn phòng do đối tác quản lý.' : current?.identity.name}
      tabs={tabItems}
      tabValue={section}
      tabsLabel="Các phần quản lý khách sạn"
      actions={!admin && current && ['DRAFT', 'REJECTED'].includes(current.authority.placeStatus) ? (
        <BoLinkButton variant="secondary" to={`${hotelUrl}/setup`}>Tiếp tục thiết lập</BoLinkButton>
      ) : undefined}
    />
  );

  let body: React.ReactNode;
  if (loadError && !current) {
    body = (
      <ErrorState
        message={loadError}
        onRetry={() => void fetchHotel(hotelId)}
      />
    );
  } else if (!current) {
    body = <LoadingState variant="detail" rows={8} />;
  } else {
    const props: SectionProps = { s: current, write: m.write, act: m.act, load: m.load, admin, base, hotelUrl };
    const key = current.identity.id + '-' + section;
    const map: Record<string, React.ReactNode> = {
      overview: <HotelOverviewSection key={key} {...props} />,
      profile: <HotelProfileSection key={key} {...props} />,
      address: <HotelAddressSection key={key} {...props} />,
      'review-status': <HotelReviewStatusSection key={key} {...props} />,
      media: <HotelMediaSection key={key} {...props} upload={m.uploadMedia} />,
      rooms: <HotelRoomsSection key={key} {...props} />,
      rates: <HotelRatesSection key={key} {...props} />,
      calendar: <PriceInventoryCalendar key={key} {...props} />,
      promotions: <HotelPromotionsSection key={key} {...props} />,
      policies: <HotelPoliciesSection key={key} {...props} />,
      content: <HotelContentReview key={key} {...props} />,
    };
    body = (
      <>
        <HotelStatusBar s={current} reloading={loading} onReload={() => void fetchHotel(current.identity.id)} />
        {m.conflict && <ConflictBanner busy={loading} onReload={() => void fetchHotel(current.identity.id)} />}
        {m.error && !m.conflict && (
          <Alert tone="danger" role="alert">
            {m.error}
          </Alert>
        )}
        {map[section]}
      </>
    );
  }

  return (
    <div className="hgp-page hgbo-stack" data-hotel-section={section}>
      {header}
      {body}
      {!admin && !current && !loading && loadError && (
        <EmptyState
          icon={Building2}
          plain
          title="Chọn hoặc tạo khách sạn"
          action={(
            <BoButton variant="secondary" onClick={() => navigate(base)}>Về danh sách khách sạn</BoButton>
          )}
        />
      )}
    </div>
  );
}

export default function HotelManagementPage(props: { admin?: boolean; embedded?: boolean }) {
  return import.meta.env.VITE_HOTEL_DOMAIN_ENABLED === 'true' ? (
    <HotelManagementEnabled {...props} />
  ) : (
    <EmptyState
      icon={Building2}
      title="Module khách sạn chưa được bật trong môi trường này."
    />
  );
}
