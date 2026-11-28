// Chuyển lỗi từ API/axios thành câu tiếng Việt dễ hiểu cho khách hàng.
// Không đổi cách gọi API: chỉ đọc lỗi mà services/api.ts đã trả về.

const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function statusOf(error: any): number | undefined {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  return typeof status === 'number' ? status : undefined;
}

export function friendlyError(error: any, fallback: string): string {
  const status = statusOf(error);
  if (error?.code === 'ECONNABORTED') return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.';
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (message && VIETNAMESE.test(message)) return message;
  if (status !== undefined && status >= 500) return 'Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
  return fallback;
}

// Ghép danh sách lỗi validation của máy chủ (`errors: string[]`) vào đúng trường.
export function serverFieldErrors<K extends string>(
  error: any,
  matchers: Record<K, RegExp>,
): { fields: Partial<Record<K, string>>; rest: string[] } {
  const fields: Partial<Record<K, string>> = {};
  const rest: string[] = [];
  const list: unknown[] = Array.isArray(error?.errors) ? error.errors : [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const key = (Object.keys(matchers) as K[]).find((name) => matchers[name].test(item));
    if (key && !fields[key]) fields[key] = item;
    else rest.push(item);
  }
  return { fields, rest };
}

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
