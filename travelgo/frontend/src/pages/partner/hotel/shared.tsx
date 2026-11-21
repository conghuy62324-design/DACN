// Phần dùng chung cho các trang con quản lý khách sạn (Gói F).
// Hàm dựng payload (profile, address, freshRoom, roomInput, freshRate, entityInput…) giữ nguyên từ
// HotelManagementPage cũ: chỉ chuyển vị trí, không đổi giá trị mặc định hay khóa gửi lên API.
import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { api } from '../../../services/api';
import { Alert, StickySaveBar } from '../../../components/backoffice';

export const initialBookingStartsAt = new Date().toISOString();

export const ROOM_AMENITIES = ['WIFI', 'TV', 'AIR_CONDITIONING', 'REFRIGERATOR', 'MINIBAR', 'BATHTUB', 'SHOWER', 'HAIR_DRYER', 'KITCHEN', 'BALCONY', 'WORK_DESK', 'PRIVATE_POOL', 'SAFE', 'TOWELS', 'ACCESSIBLE_BATHROOM'];

export const ROOM_AMENITY_LABELS: Record<string, string> = {
  WIFI: 'Wi-Fi',
  TV: 'TV',
  AIR_CONDITIONING: 'Máy lạnh',
  REFRIGERATOR: 'Tủ lạnh',
  MINIBAR: 'Minibar',
  BATHTUB: 'Bồn tắm',
  SHOWER: 'Vòi sen',
  HAIR_DRYER: 'Máy sấy tóc',
  KITCHEN: 'Bếp',
  BALCONY: 'Ban công',
  WORK_DESK: 'Bàn làm việc',
  PRIVATE_POOL: 'Hồ bơi riêng',
  SAFE: 'Két sắt',
  TOWELS: 'Khăn tắm',
  ACCESSIBLE_BATHROOM: 'Phòng tắm hỗ trợ người khuyết tật',
};

/** Tiện nghi cấp khách sạn (mã đang dùng ở trang công khai HotelPublicDetail). */
export const HOTEL_AMENITY_LABELS: Record<string, string> = {
  WIFI: 'Wi-Fi khu vực chung',
  RECEPTION: 'Lễ tân',
  PARKING: 'Bãi đỗ xe',
  POOL: 'Hồ bơi',
  RESTAURANT: 'Nhà hàng',
  ELEVATOR: 'Thang máy',
  GYM: 'Phòng tập',
  SPA: 'Spa',
  FAMILY: 'Dịch vụ gia đình',
};

export const VIEWS = ['UNKNOWN', 'SEA', 'MOUNTAIN', 'CITY', 'GARDEN', 'LAKE', 'POOL', 'NONE'];

export const ACCOMMODATION_TYPES = ['hotel', 'homestay', 'resort', 'villa', 'apartment', 'guesthouse'];

export const ACCOMMODATION_LABELS: Record<string, string> = {
  hotel: 'Khách sạn',
  homestay: 'Homestay',
  resort: 'Khu nghỉ dưỡng',
  villa: 'Biệt thự',
  apartment: 'Căn hộ',
  guesthouse: 'Nhà khách',
};

export const BED_LABELS: Record<string, string> = {
  SINGLE: 'Giường đơn',
  DOUBLE: 'Giường đôi',
  QUEEN: 'Giường Queen',
  KING: 'Giường King',
  BUNK: 'Giường tầng',
  SOFA: 'Sofa giường',
  OTHER: 'Loại khác',
};

export const optionLabels: Record<string, string> = {
  UNKNOWN: 'Chưa rõ',
  NONE: 'Không có hướng nhìn',
  SEA: 'Biển',
  MOUNTAIN: 'Núi',
  CITY: 'Thành phố',
  GARDEN: 'Vườn',
  LAKE: 'Hồ',
  POOL: 'Hồ bơi',
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang áp dụng',
  ARCHIVED: 'Đã lưu trữ',
  ROOM_ONLY: 'Chỉ phòng',
  BREAKFAST_INCLUDED: 'Bao gồm bữa sáng',
  NON_REFUNDABLE: 'Không hoàn tiền',
  FREE_UNTIL_CUTOFF: 'Hủy miễn phí trước hạn',
  CONDITIONAL: 'Điều kiện riêng',
  INCLUDED: 'Đã bao gồm',
  EXCLUDED: 'Chưa bao gồm',
  NOT_ALLOWED: 'Không nhận trẻ em',
  BANDS_REQUIRED: 'Phụ thu theo tuổi',
  PERCENT_BPS: 'Giảm theo %',
  FIXED_STAY: 'Giảm số tiền cho cả kỳ',
  PER_ROOM_NIGHT: 'Theo phòng/đêm',
  PER_ROOM_STAY: 'Theo phòng/kỳ lưu trú',
  PER_BOOKING: 'Theo đơn đặt',
};

export const label = (code: string | null | undefined) => (code ? optionLabels[code] || code : '—');

export const opts = (values: string[], labels: Record<string, string> = optionLabels) => values.map((value) => ({ value, label: labels[value] || value }));

// ---- payload builders (giữ nguyên) ----

export const profile = (s: any) => ({
  name: s?.identity.name || '',
  summary: s?.identity.summary || '',
  description: s?.identity.description || '',
  accommodationType: s?.identity.accommodationType || 'hotel',
  amenities: s?.identity.amenities || [],
  checkInTime: s?.profile.checkInTime?.slice(0, 5) || '14:00',
  checkOutTime: s?.profile.checkOutTime?.slice(0, 5) || '12:00',
  services: s?.profile.services || [],
  policies: s?.profile.policies || { children: 'Chưa cung cấp', pets: 'Chưa cung cấp', smoking: 'Chưa cung cấp', general: 'Chưa cung cấp' },
});

export const address = (s: any) => ({
  houseNumber: s?.address?.houseNumber || '',
  streetName: s?.address?.streetName || '',
  wardOrCommune: s?.address?.wardOrCommune || '',
  administrativeArea: s?.address?.administrativeArea || '',
  provinceOrCity: s?.address?.provinceOrCity || '',
  tourismDestination: s?.address?.tourismDestinationId || '',
  latitude: s?.address?.latitude ?? null,
  longitude: s?.address?.longitude ?? null,
  source: s?.address?.source || 'Đối tác cung cấp',
});

export const cleanAddress = (v: any) => Object.fromEntries(Object.entries(v).filter(([k, x]) => k !== 'tourismDestination' || x !== ''));

export const freshRoom = () => ({
  name: '',
  description: '',
  areaM2: null,
  bedrooms: 1,
  bathrooms: 1,
  beds: [{ type: 'DOUBLE', quantity: 1 }],
  extraBedAvailable: null,
  maxOccupancy: 2,
  maxAdults: 2,
  maxChildren: 0,
  view: 'UNKNOWN',
  balcony: null,
  hasWindow: null,
  kitchen: null,
  privateBathroom: null,
  amenities: [],
  status: 'DRAFT',
});

export function roomInput(r: any) {
  const v = { ...r };
  for (const k of ['id', 'placeId', 'version']) delete v[k];
  return v;
}

export const entityInput = (v: any) => {
  const r = { ...v };
  for (const k of ['id', 'placeId', 'version']) delete r[k];
  return r;
};

export const localHotelTime = (iso: string) => (iso && Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16) : '');

export const freshRate = (roomId: string) => ({
  roomTypeId: roomId,
  name: '',
  currency: 'VND',
  priceBasis: 'PER_ROOM_NIGHT',
  baseAmountVnd: 0,
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: '2028-12-31',
  minNights: 1,
  maxNights: 90,
  includedAdults: 2,
  extraAdultVndPerNight: null,
  childPolicy: 'UNKNOWN',
  childBands: [],
  mealPlan: 'ROOM_ONLY',
  cancellation: { kind: 'NON_REFUNDABLE', cutoffHours: null, terms: 'Không hoàn tiền' },
  tax: { mode: 'UNKNOWN', basisPoints: null },
  fees: [],
  mandatoryFeesKnown: false,
  status: 'DRAFT',
});

export const freshPromotion = () => ({
  roomTypeId: null,
  ratePlanId: null,
  name: '',
  currency: 'VND',
  kind: 'PERCENT_BPS',
  value: 1000,
  maxDiscountVnd: null,
  bookingStartsAt: initialBookingStartsAt,
  bookingEndsAt: '2028-01-01T00:00:00Z',
  stayFrom: new Date().toISOString().slice(0, 10),
  stayUntil: '2028-12-31',
  minNights: 1,
  status: 'DRAFT',
});

// ---- props chung cho trang con ----

export type WriteOptions = { success?: string };

export type WriteFn = (path: string, method?: string, body?: any, options?: WriteOptions) => Promise<any>;

export interface SectionProps {
  /** Dữ liệu khách sạn (GET …/hotels/:id). */
  s: any;
  write: WriteFn;
  /** Như write nhưng nuốt lỗi (lỗi đã hiện ở thanh thông báo của container). */
  act: (path: string, method?: string, body?: any) => void;
  load: (id: string) => Promise<any>;
  admin: boolean;
  /** "/partner/hotels" hoặc "/admin/hotels" (đường dẫn API và URL giao diện trùng tiền tố). */
  base: string;
  /** URL giao diện của khách sạn đang xem, vd. /partner/hotels/:id */
  hotelUrl: string;
}

// ---- Editor: giữ cơ chế cũ (state cục bộ, reset khi initial đổi, set lại initial mới sau khi lưu) ----

export interface EditorProps {
  initial: any;
  save: (value: any) => Promise<any>;
  children: (value: any, set: (key: string, value: any) => void) => React.ReactNode;
  label?: string;
  /** Biểu mẫu tạo mới: cho bấm lưu kể cả khi chưa sửa gì (như nút cũ). */
  creating?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  extraActions?: React.ReactNode;
}

export function Editor({ initial, save, children, label = 'Lưu thay đổi', creating = false, onDirtyChange, extraActions }: EditorProps) {
  const [value, set] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latestInitial = useRef(initial);
  const formRef = useRef<HTMLFormElement>(null);
  latestInitial.current = initial;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => set(initial), [JSON.stringify(initial)]);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save(value);
      set(latestInitial.current);
    } catch (err: any) {
      setError(err.message || err.error?.message || 'Không lưu được. Hãy kiểm tra dữ liệu hoặc tải lại khi có xung đột.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      ref={formRef}
      className="hgp-editor"
      onSubmit={submit}
    >
      {children(value, (k: string, v: any) => set((p: any) => ({ ...p, [k]: v })))}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <StickySaveBar
        dirty={dirty || creating}
        busy={busy}
        statusText={creating && !dirty ? 'Bản mới, chưa lưu lên hệ thống' : undefined}
        onSave={() => formRef.current?.requestSubmit()}
        onReset={() => {
          set(initial);
          setError('');
        }}
        saveLabel={busy ? 'Đang lưu…' : label}
        extraActions={extraActions}
      />
    </form>
  );
}

// ---- ảnh quản trị (blob qua API có xác thực, giữ cơ chế cũ) ----

export function MediaPicture({ hotelId, media, admin, className = 'hgp-media__img' }: { hotelId: string; media: any; admin: boolean; className?: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let object = '';
    setFailed(false);
    api
      .get(`/${admin ? 'admin' : 'partner'}/hotels/${hotelId}/media/${media.id}/file`, { responseType: 'blob' })
      .then((blob: any) => {
        object = URL.createObjectURL(blob);
        if (live) setUrl(object);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [hotelId, media.id, admin]);
  if (url) {
    return (
      <img
        src={url}
        alt={media.altText || 'Ảnh khách sạn'}
        className={className}
      />
    );
  }
  return (
    <span
      className={`${className} hgp-media__ph`}
      role="img"
      aria-label={failed ? 'Chưa tải được ảnh' : 'Đang tải ảnh'}
    >
      <ImageOff aria-hidden="true" />
    </span>
  );
}

// ---- tiện ích ngày (ngày lưu trú "YYYY-MM-DD", giờ Việt Nam) ----

export const todayVN = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

export const addDays = (date: string, n: number) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

export const diffDays = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);

export const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Theo dõi media query (không lỗi khi không có window). */
export function useMedia(query: string) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Lấy "Giá gói từ": giá cơ sở của gói đầu tiên của hạng phòng (như bảng cũ). */
export const firstRateAmount = (s: any, roomId: string) => s.rates.find((p: any) => p.roomTypeId === roomId)?.baseAmountVnd;

export const contentPending = (h: { contentVersion?: number; approvedContentVersion?: number | null }) => Number(h.contentVersion || 0) > Number(h.approvedContentVersion ?? 0);
