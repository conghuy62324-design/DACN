import { HttpError } from './httpError.js';

export const TRAVEL_PREFERENCE_IDS = [
  'bien',
  'thien-nhien',
  'van-hoa',
  'am-thuc',
  'nghi-duong',
  'check-in',
  'phieu-luu',
  'mua-sam',
] as const;

export type TravelPreference = typeof TRAVEL_PREFERENCE_IDS[number];

export const MAX_TRAVEL_PREFERENCES = TRAVEL_PREFERENCE_IDS.length;
export const MAX_TRAVEL_PREFERENCE_LENGTH = 32;

const allowedPreferences = new Set<string>(TRAVEL_PREFERENCE_IDS);

/**
 * Validate explicit user input only. Missing preferences stay empty for old
 * itineraries; no preference is inferred from summaries, reviews or places.
 */
export function validateTravelPreferences(value: unknown): TravelPreference[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'preferences phải là một mảng', 'INVALID_PREFERENCES');
  }
  if (value.length > MAX_TRAVEL_PREFERENCES) {
    throw new HttpError(
      400,
      `Chỉ được chọn tối đa ${MAX_TRAVEL_PREFERENCES} sở thích`,
      'TOO_MANY_PREFERENCES'
    );
  }

  const validated: TravelPreference[] = [];
  for (const rawPreference of value) {
    if (typeof rawPreference !== 'string') {
      throw new HttpError(400, 'Mỗi preference phải là chuỗi', 'INVALID_PREFERENCES');
    }
    const preference = rawPreference.trim();
    if (!preference || preference.length > MAX_TRAVEL_PREFERENCE_LENGTH) {
      throw new HttpError(400, 'Preference có độ dài không hợp lệ', 'INVALID_PREFERENCES');
    }
    if (!allowedPreferences.has(preference)) {
      throw new HttpError(400, `Preference không được hỗ trợ: ${preference}`, 'UNSUPPORTED_PREFERENCE');
    }
    if (!validated.includes(preference as TravelPreference)) {
      validated.push(preference as TravelPreference);
    }
  }
  return validated;
}
