import type { Place, ItineraryActivity } from '../types';
import { formatCurrencyVND } from './formatters';

/** Images (and any future data-backed map links) accept HTTP(S) or root-relative app paths.
 * No protocol-relative URLs, backslashes, control characters or implicit/opaque schemes.
 */
export function safeMapUrl(value: unknown, origin = window.location.origin): string | undefined {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  const input = value.trim();
  const internal = input.startsWith('/') && !input.startsWith('//');
  if (!internal && !/^https?:\/\//i.test(input)) return undefined;
  try {
    const url = new URL(input, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (internal && url.origin !== new URL(origin).origin) return undefined;
    return url.href;
  } catch { return undefined; }
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element.style, style);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function placeMarker(rating: number, categoryClass: string, selected: boolean): HTMLElement {
  const pin = node('div', {});
  pin.className = `custom-marker-pin ${categoryClass}${selected ? ' ring-4 ring-orange-400 scale-125 z-50' : ''}`;
  pin.append(node('span', { fontSize: '11px', fontWeight: '800' }, `★ ${rating.toFixed(1)}`));
  return pin;
}

export function roundMapMarker(label: string, color: string, size: 28 | 30): HTMLElement {
  return node('div', { backgroundColor: color, color: 'white', width: `${size}px`, height: `${size}px`, borderRadius: '9999px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', border: '2px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }, label);
}

export function placePopup(place: Pick<Place, 'name' | 'heroImage' | 'city' | 'category' | 'priceFrom' | 'bayesianRating'>): HTMLElement {
  const root = node('div', { width: '220px', fontFamily: 'Inter, sans-serif', padding: '2px' });
  const image = node('img', { width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' });
  image.alt = place.name;
  const url = safeMapUrl(place.heroImage);
  // MapView has no fallback image asset: retain its alt text without an unsafe/empty src.
  if (url) image.src = url;
  image.addEventListener('error', () => image.removeAttribute('src'), { once: true });
  const heading = node('h4', { fontWeight: '700', fontSize: '13px', color: '#0f172a', margin: '0 0 4px 0', lineHeight: '1.3' }, place.name);
  const location = node('p', { fontSize: '11px', color: '#64748b', margin: '0 0 6px 0' }, `${place.city} • ${place.category.toUpperCase()}`);
  const footer = node('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '6px' });
  footer.append(node('span', { fontWeight: '800', color: '#ea580c', fontSize: '13px' }, formatCurrencyVND(place.priceFrom)),
    node('span', { fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }, `Bayesian: ${place.bayesianRating.toFixed(2)}`));
  root.append(image, heading, location, footer);
  return root;
}

export function plannerPopup(dayNumber: number, activity: ItineraryActivity, color: string): HTMLElement {
  const root = node('div', { fontFamily: 'inherit', fontSize: '12px', minWidth: '180px' });
  root.append(node('div', { fontSize: '10px', fontWeight: 'bold', color, marginBottom: '2px' }, `NGÀY ${dayNumber} - ${activity.timeSlot.toUpperCase()}`),
    node('strong', { fontSize: '13px', color: '#0f172a' }, activity.title),
    node('p', { margin: '4px 0', color: '#475569', fontSize: '11px' }, activity.description),
    node('div', { fontSize: '11px', fontWeight: 'bold', color: '#ea580c', marginTop: '4px' }, `Chi phí ước tính: ${new Intl.NumberFormat('vi-VN').format(activity.estimatedCostVND)}đ`));
  return root;
}

export function tripPopup(activity: ItineraryActivity, checked: boolean): HTMLElement {
  const root = node('div', { fontSize: '12px', fontFamily: 'inherit' });
  root.append(node('div', { fontWeight: 'bold', color: checked ? '#10b981' : '#0284c7' }, checked ? '✓ ĐÃ GHÉ THĂM' : 'ĐIỂM DỰ KIẾN'),
    node('strong', {}, activity.title), node('p', { margin: '4px 0', color: '#64748b', fontSize: '11px' }, activity.description));
  return root;
}
