import { HttpError } from '../utils/httpError.js';

/** Bounded response, no redirects, no raw upstream bodies/headers in errors or logs. */
export async function externalJson(fetcher: typeof fetch, url: string, init: RequestInit, maxBytes = 262144): Promise<any> {
  const response = await fetcher(url, { ...init, redirect: 'error' });
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(response.status === 429 ? 429 : 502, 'Dịch vụ bên ngoài chưa xử lý được yêu cầu.', response.status === 429 ? 'EXTERNAL_QUOTA' : 'EXTERNAL_UNAVAILABLE');
  }
  if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw Error('RESPONSE_LIMIT'); }
  const reader = response.body?.getReader(); if (!reader) throw Error('EMPTY_RESPONSE');
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) { init.signal?.throwIfAborted(); const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw Error('RESPONSE_LIMIT'); } chunks.push(value); }
    init.signal?.throwIfAborted(); return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}
