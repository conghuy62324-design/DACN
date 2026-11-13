// Keep absent values distinct from valid numeric zero in controlled fields.
export const formValue = (value: any) => value ?? '';

export function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function serializeDateTime(value: string, original?: string | null): string | null | undefined {
  // A minute-resolution control must not discard stored seconds/milliseconds on no-op save.
  if (value === toLocalDateTime(original)) return original;
  if (!value) return value;
  // datetime-local is browser local time. Send an explicit instant, independent of server TZ.
  return new Date(value).toISOString();
}
