// Định dạng ngày giờ vi-VN, múi Asia/Ho_Chi_Minh ("21/11/2026 10:32") và tiền ("1.250.000 ₫").

const TZ = 'Asia/Ho_Chi_Minh';

const dateTimeFmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const map: Record<string, string> = {};
  for (const part of dateTimeFmt.formatToParts(date)) map[part.type] = part.value;
  return map;
}

export function fmtDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const p = parts(value);
  if (!p) return String(value);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function fmtDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  // Ngày thuần "YYYY-MM-DD" (ngày lưu trú) không đổi múi giờ.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const p = parts(value);
  if (!p) return String(value);
  return `${p.day}/${p.month}/${p.year}`;
}

export function fmtTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const p = parts(value);
  return p ? `${p.hour}:${p.minute}` : '—';
}

/** Ngày giờ rút gọn "21/11 08:00" cho lịch hiển thị. */
export function fmtShortDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const p = parts(value);
  if (!p) return String(value);
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

const numberFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return numberFmt.format(Number(value));
}

export function fmtVnd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return `${numberFmt.format(Number(value))} ₫`;
}

export function fmtPercent(value: number, digits = 1): string {
  return `${value.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

/** Chữ cái đầu cho avatar 32 (không tải ảnh ngoài). */
export function initials(name: string | null | undefined): string {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 1);
  return words[0].slice(0, 1) + words[words.length - 1].slice(0, 1);
}

/** Thông điệp lỗi API (backend trả {success:false,message,code}). */
export function errorMessage(error: unknown, fallback: string): string {
  const e = error as any;
  if (e && typeof e.message === 'string' && e.message && !/^Request failed|Network Error|timeout/i.test(e.message)) return e.message;
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  const e = error as any;
  return typeof e?.code === 'string' ? e.code : undefined;
}

/** Mã HTTP nếu có (axios error gốc khi không có response.data). */
export function errorStatus(error: unknown): number | undefined {
  const e = error as any;
  return e?.status ?? e?.response?.status;
}
