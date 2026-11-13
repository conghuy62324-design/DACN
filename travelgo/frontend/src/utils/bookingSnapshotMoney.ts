/** A missing legacy amount is unknown, not zero and not the current quote. */
export function bookingSnapshotMoney(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}
