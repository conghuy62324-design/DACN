import { AGENT_TOOLS, parseDecision, validateTool, type MissingField, type ToolDecision, type ToolName } from './tools.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { calculatePlannerDays } from '../utils/plannerValidation.js';

export type ProvenanceResult = { status: 'ALLOW' } |
  { status: 'NEEDS_INPUT'; missing: MissingField[] } | { status: 'REJECT' };

// G1 deliberately recognizes a narrow set of explicit current-turn forms. This
// is a safety gate, not a general Vietnamese NLU parser. Unknown forms fail closed.
const fold = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const uncertain = /\b(?:không|chưa|chẳng|chả|đừng|khong|chua)\b|\?/iu;
const unsafeIntent = /(?:^|[\s;,.])(?:ignore (?:previous|all|system)|system override|bỏ qua (?:chỉ dẫn|hướng dẫn|quy tắc)|lưu trip|save trip|tạo booking|đặt (?:booking|vé|phòng|dịch vụ)|xóa (?:trip|booking)|sửa (?:trip|booking))(?=$|[\s;,.])/iu;
const ambiguousContext = /["“”]|(?:assistant|người khác|tài khoản khác)\s*:|(?:nhưng|nếu|có thể|chưa chắc)(?=$|[\s;,.])/iu;
// One source of label roles for observation and completeness evidence. No new grammar.
const labels = {
  departureCity: ['nơi xuất phát', 'xuất phát', 'từ'], destinationCity: ['điểm đến', 'đến'],
  startDate: ['ngày bắt đầu', 'bắt đầu'], endDate: ['ngày kết thúc', 'kết thúc'],
  adults: ['số người lớn', 'người lớn'], totalBudget: ['ngân sách cả nhóm', 'ngân sách chuyến đi'],
  dailyBudgetPerPerson: ['ngân sách mỗi người mỗi ngày', 'ngân sách mỗi người/ngày'],
  transportation: ['phương tiện'], children: ['số trẻ em', 'trẻ em'], category: ['danh mục'],
} as const;
function supportedSegments(message: string): boolean {
  const segments = message.split(/[;,\n]/u).map(part => part.trim().replace(/[.!?]$/u, '').trim()).filter(Boolean);
  const intent = /^(?:lập lịch trình|lên lịch trình|tìm địa điểm|tìm nơi|tìm khách sạn|plan trip|search places)$/iu;
  const label = /^(?:nơi xuất phát|xuất phát|từ|điểm đến|đến|ngày bắt đầu|bắt đầu|ngày kết thúc|kết thúc|số người lớn|người lớn|ngân sách cả nhóm|ngân sách chuyến đi|ngân sách mỗi người mỗi ngày|ngân sách mỗi người\/ngày|phương tiện|số trẻ em|trẻ em|danh mục)\s*:\s*.+$/iu;
  const correction = /^(?:tôi không đi [\p{L}\s]+|tôi muốn đi [\p{L}\s]+|tôi chọn (?:ô tô|xe máy)|tôi muốn đi bằng (?:ô tô|xe máy)|à đổi sang (?:ô tô|xe máy))$/iu;
  return segments.length > 0 && segments.every(segment => intent.test(segment) || label.test(segment) || correction.test(segment));
}
function unresolvedNegation(message: string): boolean {
  const words = [...message.matchAll(/(?:^|[\s;,.])(không|chưa|chẳng|chả|đừng)(?=$|[\s;,.])/giu)]
    .map(match => fold(match[1]));
  if (!words.length) return false;
  // One explicit destination correction is the sole supported negated form.
  return words.length !== 1 || words[0] !== 'không' ||
    !/không\s+đi\s+[^,;.\n]+,\s*tôi\s+muốn\s+đi\s+[^,;.\n]+/iu.test(message);
}

function labeled(message: string, labels: readonly string[]): string[] {
  const parts = message.split(/[;,\n]/u);
  const found: string[] = [];
  for (const part of parts) {
    for (const label of labels) {
      const match = part.trim().match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'iu'));
      if (match) found.push(match[1].trim());
    }
  }
  return found;
}

function unique(values: string[]): string | undefined {
  const clean = values.map(v => v.trim()).filter(v => v && !uncertain.test(v));
  return clean.length && clean.every(v => fold(v) === fold(clean[0])) ? clean[0] : undefined;
}

function amount(raw: string): number | undefined {
  const value = fold(raw).replace(/\s*vnd$/u, '');
  const match = value.match(/^(\d+(?:[.,]\d+)?)\s*(triệu|trieu|k|nghìn|nghin)?$/u);
  if (!match) return undefined;
  const number = Number(match[1].replace(',', '.'));
  const scale = match[2] === 'triệu' || match[2] === 'trieu' ? 1_000_000 :
    ['k', 'nghìn', 'nghin'].includes(match[2] || '') ? 1_000 : 1;
  const result = number * scale;
  return Number.isSafeInteger(result) ? result : undefined;
}

function positiveDestinations(message: string): string[] {
  return [...message.matchAll(/\b(?:tôi|mình)\s+muốn\s+đi\s+([^,;.\n]+)|\bđiểm\s+đến\s+là\s+([^,;.\n]+)/giu)]
    .map(m => m[1] || m[2]);
}
function destination(message: string): string | undefined {
  const explicit = labeled(message, labels.destinationCity);
  if (explicit.length) {
    const value = unique(explicit);
    const negatives = [...message.matchAll(/không\s+đi\s+([^,;.\n]+)/giu)].map(m => m[1]);
    return value && negatives.some(v => fold(v) === fold(value)) ? undefined : value;
  }
  return unique(positiveDestinations(message));
}

function transportPhrases(message: string): string[] {
  return [...message.matchAll(/(?:chọn|đi bằng|bằng|đổi sang)\s+(ô tô|xe máy|car|motorbike)(?=$|[\s,;.])/giu)]
    .filter(m => !uncertain.test(message.slice(Math.max(0, m.index! - 12), m.index)))
    .map(m => m[1]);
}
function transportation(message: string): string | undefined {
  if (/chưa\s+(?:chọn|quyết định)\s+phương tiện|không\s+chọn\s+phương tiện/iu.test(message)) return undefined;
  const explicit = labeled(message, labels.transportation);
  let phrases = explicit;
  if (!phrases.length) {
    phrases = transportPhrases(message);
    // Multiple choices require the FINAL transport-bearing clause itself to
    // be a supported correction, not merely an earlier "đổi sang" anywhere.
    if (phrases.length > 1 && /đổi sang\s+(ô tô|xe máy|car|motorbike)(?=$|[\s,;.])/iu.test(message)) {
      const clauses = message.split(/[;,\n]/u).map(part => part.trim().replace(/[.!?]$/u, '').trim())
        .filter(part => transportPhrases(part).length > 0);
      const correction = clauses[clauses.length - 1]?.match(/^à đổi sang (ô tô|xe máy)$/iu);
      if (!correction) return undefined;
      phrases = [correction[1]];
    }
  }
  const value = unique(phrases);
  if (!value) return undefined;
  const normalized = fold(value);
  if (normalized === 'ô tô' || normalized === 'car') {
    return /không\s+đi\s+(?:bằng\s+)?(?:ô tô|car)(?=$|[\s;,.])/iu.test(message) ? undefined : 'car';
  }
  if (normalized === 'xe máy' || normalized === 'motorbike') {
    return /không\s+đi\s+(?:bằng\s+)?(?:xe máy|motorbike)(?=$|[\s;,.])/iu.test(message) ? undefined : 'motorbike';
  }
  return undefined;
}

function observed(message: string, field: string): unknown {
  switch (field) {
    case 'departureCity': return unique(labeled(message, labels.departureCity));
    case 'destinationCity': return destination(message);
    case 'startDate': return /chưa\s+(?:chọn|chốt|xác định)\s+ngày/iu.test(message) ? undefined : unique(labeled(message, labels.startDate));
    case 'endDate': return /chưa\s+(?:chọn|chốt|xác định)\s+ngày/iu.test(message) ? undefined : unique(labeled(message, labels.endDate));
    case 'adults': {
      const value = unique([...labeled(message, labels.adults),
        ...[...message.matchAll(/\b(\d+)\s+người lớn\b/giu)].map(m => m[1])]);
      return value && /^\d+$/u.test(value) ? Number(value) : undefined;
    }
    case 'totalBudget': {
      if (/chưa\s+(?:chọn|chốt|xác định)\s+ngân sách/iu.test(message)) return undefined;
      const value = unique(labeled(message, labels.totalBudget));
      return value ? amount(value) : undefined;
    }
    case 'dailyBudgetPerPerson': {
      const value = unique(labeled(message, labels.dailyBudgetPerPerson));
      return value ? amount(value) : undefined;
    }
    case 'transportation': return transportation(message);
    case 'children': {
      const value = unique([...labeled(message, labels.children),
        ...[...message.matchAll(/\b(\d+)\s+trẻ em\b/giu)].map(m => m[1])]);
      return value && /^\d+$/u.test(value) ? Number(value) : undefined;
    }
    case 'category': return unique(labeled(message, labels.category));
    default: return undefined;
  }
}

function equalValue(actual: unknown, proof: unknown): boolean {
  if (typeof actual === 'string' && typeof proof === 'string') return fold(actual) === fold(proof);
  return actual === proof;
}

/** Shared current-turn observation: no model tool name/history/default selects intent.
 * Reuses G1's grammar/extractors. Negation/ambiguity outside its positive grammar
 * returns null rather than guessing which field a user meant to unset.
 */
function readLabeledSlots(currentMessage: string, boundIntent?: ToolName): {
  toolName: ToolName; values: Record<string, unknown>;
} | null {
  if (typeof currentMessage !== 'string' || unsafeIntent.test(currentMessage) || ambiguousContext.test(currentMessage) ||
    !supportedSegments(currentMessage) || unresolvedNegation(currentMessage)) return null;
  const intents = currentMessage.split(/[;,\n]/u).map(part => part.trim().replace(/[.!?]$/u, '').trim()).flatMap(part => {
    if (/^(?:lập lịch trình|lên lịch trình|plan trip)$/iu.test(part)) return ['plan_trip' as const];
    if (/^(?:tìm địa điểm|tìm nơi|tìm khách sạn|search places)$/iu.test(part)) return ['search_places' as const];
    return [];
  });
  if (intents.length > 1 || !intents.length && !boundIntent || intents.length && boundIntent && intents[0] !== boundIntent) return null;
  const spec = AGENT_TOOLS.find(tool => tool.name === (intents[0] || boundIntent));
  const values: Record<string, unknown> = {};
  for (const field of spec.parameters.required) {
    const value = observed(currentMessage, field);
    if (value !== undefined) values[field] = value;
  }
  return { toolName: spec.name, values };
}

/** Shared completeness/execution proof. Undefined observed value is
 * not proof of omission when a label/correction actually mentions that field.
 * Unset/negation outside the existing positive grammar still returns null. */
function inspectLabeledSlots(message: string, boundIntent?: ToolName) {
  const context = readLabeledSlots(message, boundIntent);
  if (!context) return null;
  const spec = AGENT_TOOLS.find(tool => tool.name === context.toolName)!;
  const states: Partial<Record<MissingField, 'SET' | 'OMITTED' | 'UNPROVEN'>> = {};
  for (const field of spec.parameters.required) {
    const mentioned = labeled(message, labels[field]).length > 0 ||
      (field === 'destinationCity' && positiveDestinations(message).length > 0) ||
      (field === 'transportation' && transportPhrases(message).length > 0);
    states[field] = context.values[field] !== undefined ? 'SET' : mentioned ? 'UNPROVEN' : 'OMITTED';
    // unique() may discard an uncertain mention and leave an older value. That
    // omission is not verified current evidence for execution or completeness.
    const positiveMentions = message.split(/[;,\n]/u).filter(part => field === 'transportation' ? transportPhrases(part.trim().replace(/[.!?]$/u, '')).length > 0 :
      field === 'destinationCity' && positiveDestinations(part).length > 0 && !transportPhrases(part).length);
    if ([...labeled(message, labels[field]), ...positiveMentions].some(value => uncertain.test(value))) states[field] = 'UNPROVEN';
    // A label can mask a later positive correction in the legacy reader. Never
    // claim completeness or authorize execution from conflicting evidence.
    if (states[field] === 'SET' && labeled(message, labels[field]).length &&
      (field === 'destinationCity' || field === 'transportation')) {
      const alternativeText = message.split(/[;,\n]/u).filter(part => !labeled(part, labels[field]).length &&
        (field !== 'destinationCity' || !transportPhrases(part).length)).join(';');
      const alternatives = field === 'destinationCity' ? positiveDestinations(alternativeText) : transportPhrases(alternativeText);
      if (alternatives.length && !equalValue(context.values[field], observed(alternativeText, field))) states[field] = 'UNPROVEN';
    }
  }
  return { ...context, states };
}

export type ProofState = 'SET' | 'OMITTED' | 'UNPROVEN' | 'CONFLICT';
export interface CurrentTurnProof {
  toolName: ToolName;
  dialect: 'LABELED' | 'NATURAL';
  values: Record<string, unknown>;
  states: Partial<Record<MissingField, ProofState>>;
  optionalValues: Record<string, unknown>;
  optionalStates?: Record<string, ProofState>;
  accentInsensitiveCities: string[];
  valid: boolean;
}
const ascii = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/gu, 'd').toLowerCase();
export function isUnsafeCurrentMessage(message: string): boolean {
  return /(?:^|[\s;,.])(?:ignore (?:previous|all|system)|system override|bo qua (?:chi dan|huong dan|quy tac|system)|luu trip|save trip|create_booking|tao booking|dat (?:booking|ve|phong|dich vu)|xoa (?:trip|booking)|sua (?:trip|booking)|tai khoan khac|account khac)(?=$|[\s;,.])/u.test(ascii(message));
}
function quoted(message: string) {
  return /["“”‘’`]|(?:^|\s)'[^']+'|(?:^|[\n])\s*>|(?:^|[.;]\s*)(?:assistant|system|vi du|noi dung mau)\s*:/u.test(ascii(message));
}
export function matchesCurrentProof(proof: CurrentTurnProof, field: string, actual: unknown): boolean {
  const value = Object.hasOwn(proof.values, field) ? proof.values[field] : proof.optionalValues[field];
  if (typeof value === 'string' && typeof actual === 'string' && proof.accentInsensitiveCities.includes(field)) return ascii(fold(value)) === ascii(fold(actual));
  return equalValue(actual, value);
}

/** Small, full-coverage clause grammar, NOT general NLU. Each semantic clause
 * must be consumed. Unsupported residue, quotes, roles and conditions fail closed.
 * Values come only from this function's message argument, never model/history. */
function naturalProof(original: string, boundIntent?: ToolName): CurrentTurnProof | null {
  const s = ascii(original);
  if (s.length !== original.length || /[:"“”`]/u.test(s) || /\b(?:neu|co the|chua chac|assistant|system)\b/u.test(s)) return null;
  const mask = Array(s.length).fill(false), seen: Record<string, Array<{ value: unknown; start: number }>> = {};
  const uncertainFields: Record<string, ProofState> = {}, optionalValues: Record<string, unknown> = {}, accentInsensitiveCities: string[] = [];
  const optionalStates: Record<string, ProofState> = {};
  const used = (start: number, end: number) => mask.slice(start, end).some(Boolean);
  const mark = (start: number, end: number) => { for (let i = start; i < end; i++) mask[i] = true; };
  const add = (field: string, value: unknown, start: number) => (seen[field] ||= []).push({ value, start });
  const unknown = (field: string, state: ProofState = 'UNPROVEN') => { uncertainFields[field] = state; };
  function scan(regex: RegExp, action: (m: RegExpMatchArray) => void) {
    for (const m of s.matchAll(regex)) { if (used(m.index!, m.index! + m[0].length)) continue; action(m); mark(m.index!, m.index! + m[0].length); }
  }
  const intents: Array<{ name: ToolName; start: number; end: number; category?: string }> = [];
  for (const m of s.matchAll(/(?:^|[.;]\s*)(?:giup (?:toi|minh) )?(?:lap lich(?: trinh)?|len lich trinh)(?: giup (?:toi|minh))?(?=\s|[.;!]|$)/g)) intents.push({ name: 'plan_trip', start: m.index!, end: m.index! + m[0].length });
  for (const m of s.matchAll(/(?:^|[.;]\s*)(?:(?:toi|minh) muon )?tim (dia diem tham quan|diem tham quan|khach san|nha hang|dia diem|noi)(?=\s|[.;!]|$)/g)) intents.push({ name: 'search_places', start: m.index!, end: m.index! + m[0].length, category: /tham quan/u.test(m[1]) ? 'attraction' : m[1] === 'khach san' ? 'hotel' : m[1] === 'nha hang' ? 'restaurant' : undefined });
  if (intents.length > 1 || !intents.length && !boundIntent || intents.length && boundIntent && intents[0].name !== boundIntent) return null;
  const intent = intents[0] || { name: boundIntent!, start: -1, end: -1 };
  if (intent.start >= 0) mark(intent.start, intent.end);
  if (intent.category) { optionalValues.category = intent.category; optionalStates.category = 'SET'; }
  const originalGroup = (m: RegExpMatchArray, n: number) => { const range = (m as any).indices[n]; return original.slice(range[0], range[1]).trim(); };
  function city(field: string, raw: string, start: number) {
    let value = raw.trim(); const alias = value.match(/^([\p{L}]{1,4})\s*\(([\p{L}\s]+)\)$/u);
    if (alias) { const initials = ascii(alias[2]).trim().split(/\s+/u).map(x => x[0]).join(''); if (ascii(alias[1]) !== initials) { unknown(field); return; } value = alias[2].trim(); }
    if (!value || value.length > 120 || !/^[\p{L}][\p{L}\s-]*$/u.test(value) && !/^[A-Za-z][A-Za-z0-9_]+$/u.test(value) || /\b(?:hoac|hay|va|voi|khong|chua|neu)\b/u.test(ascii(value))) { unknown(field); return; }
    if (ascii(value) === value.toLowerCase()) accentInsensitiveCities.push(field);
    add(field, value, start);
  }
  const num = '(\\d+(?:[.,]\\d+)?)\\s*(trieu|tr|nghin|k)?(?:\\s*(?:dong|vnd))?';
  const amount = (m: RegExpMatchArray, index = 1) => { const scale = ['trieu', 'tr'].includes(m[index + 1]) ? 1e6 : ['nghin', 'k'].includes(m[index + 1]) ? 1000 : 1; const result = Number(m[index].replace(',', '.')) * scale; return Number.isSafeInteger(result) ? result : undefined; };
  const date = '(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})';
  const iso = (value: string) => value.includes('/') ? value.split('/').reverse().map((x, i) => i ? x.padStart(2, '0') : x).join('-') : value;
  // G2 binds only an authenticated server-owned pending intent; no old messages
  // or old values enter this parser. G1 never activates these follow-up clauses.
  if (boundIntent) {
    scan(/(?:,\s*)?giu (?:thong tin|cac thong tin) con lai[.!]?$/g, () => {});
    scan(new RegExp('doi ngan sach ca nhom (?:thanh|la)\\s+'+num,'g'), m => intent.name === 'plan_trip' ? add('totalBudget', amount(m), m.index!) : unknown('dailyBudgetPerPerson'));
    scan(new RegExp('doi ngay (bat dau|ket thuc) (?:thanh|la)\\s+'+date,'g'), m => add(m[1] === 'bat dau' ? 'startDate' : 'endDate', iso(m[2]), m.index!));
    scan(/doi (?:thanh\s+)?(\d+)\s*(?:nguoi lon|nl)(?=$|[\s,;.!])/g, m => add('adults', Number(m[1]), m.index!));
    scan(/(?:toi\s+)?(?:huy|bo|chua chon)\s+(phuong tien|ngan sach ca nhom|diem den|noi xuat phat|so nguoi lon|ngay bat dau|ngay ket thuc)/g, m => unknown(({ 'phuong tien':'transportation','ngan sach ca nhom':'totalBudget','diem den':'destinationCity','noi xuat phat':'departureCity','so nguoi lon':'adults','ngay bat dau':'startDate','ngay ket thuc':'endDate' })[m[1]]));
  }
  scan(/(?:tu\s+)?ngay\s+(\d{1,2})\s+(?:den|toi)\s+(\d{1,2})\s+thang\s+(\d{1,2})\s+nam\s+(\d{4})/g, m => { add('startDate', `${m[4]}-${m[3].padStart(2,'0')}-${m[1].padStart(2,'0')}`, m.index!); add('endDate', `${m[4]}-${m[3].padStart(2,'0')}-${m[2].padStart(2,'0')}`, m.index!); });
  scan(new RegExp('(?:tu\\s+|trong ngay\\s+|ngay\\s+|vao\\s+)?'+date+'\\s*(?:den|toi|->|[-–])\\s*'+date,'g'), m => { add('startDate', iso(m[1]), m.index!); add('endDate', iso(m[2]), m.index!); });
  scan(/(?:tu\s+)?\d{1,2}\/\d{1,2}\s*(?:den|toi|[-–])\s*\d{1,2}\/\d{1,2}(?![\d/])/g, () => { unknown('startDate'); unknown('endDate'); });
  scan(new RegExp('(?:ngan sach\\s+)?'+num+'(?:\\s*(?:moi\\s+)?nguoi\\s*(?:/\\s*|(?:moi\\s+)?)ngay|\\s*/\\s*nguoi\\s*/\\s*ngay)','g'), m => { const value = amount(m); if (intent.name === 'search_places') add('dailyBudgetPerPerson', value, m.index!); else unknown('totalBudget'); });
  scan(new RegExp('(?:ngan sach (?:ca nhom|nhom|chuyen di)|tong ngan sach|(?:ca )?nhom(?: (?:toi|minh|chung toi) co(?: khoang)?)?)\\s*(?:la\\s+)?'+num,'g'), m => { if (intent.name === 'plan_trip') add('totalBudget', amount(m), m.index!); else unknown('dailyBudgetPerPerson'); });
  scan(new RegExp(num+'\\s+(?:cho\\s+)?(?:ca nhom|nhom)','g'), m => { if (intent.name === 'plan_trip') add('totalBudget', amount(m), m.index!); else unknown('dailyBudgetPerPerson'); });
  scan(/(?:gom\s+|voi\s+)?(\d+)\s*(?:nguoi lon|nl(?:\s*\(nguoi lon\))?)(?![a-z])/g, m => add('adults', Number(m[1]), m.index!));
  scan(/(\d+)\s*tre em/g, m => add('children', Number(m[1]), m.index!));
  // Corrections are resolved only after all ordinary evidence has been read.
  const corrections: Array<{ field: string; old?: string; value: string; start: number; raw: string }> = [];
  scan(/(?:a\s+)?doi sang (o to|xe may)(?=$|[\s,;.!])/g, m => corrections.push({ field: 'transportation', value: m[1] === 'o to' ? 'car' : 'motorbike', start: m.index!, raw: m[1] }));
  const end = '(?=\\s*(?:[,;.!]|$)|\\s+(?:tu\\s+(?:ngay\\s+)?\\d|ngay\\s+\\d|trong\\s+ngay|gom\\s+\\d|voi\\s+\\d|ngan sach))';
  scan(new RegExp('(?:a\\s+)?doi diem den thanh\\s+(.+?)'+end,'dg'), m => corrections.push({ field: 'destinationCity', value: originalGroup(m, 1), raw: originalGroup(m, 1), start: m.index! }));
  scan(new RegExp('(?:toi\\s+)?khong di\\s+(.+?),\\s*(?:toi|minh) muon di\\s+(.+?)'+end,'dg'), m => corrections.push({ field: 'destinationCity', old: originalGroup(m, 1), value: originalGroup(m, 2), raw: originalGroup(m, 2), start: m.index! }));
  scan(new RegExp('(?:tu|xuat phat tu)\\s+(.+?)\\s*(?:->| den | toi )\\s*(.+?)'+end,'dg'), m => { city('departureCity', originalGroup(m, 1), m.index!); city('destinationCity', originalGroup(m, 2), m.index!); });
  scan(new RegExp('(?:de\\s+)?di\\s+(.+?)\\s+tu\\s+(.+?)'+end,'dg'), m => { city('destinationCity', originalGroup(m, 1), m.index!); city('departureCity', originalGroup(m, 2), m.index!); });
  if (intent.name === 'search_places') scan(new RegExp('(?:o|tai|den)\\s+(.+?)'+end,'dg'), m => city('destinationCity', originalGroup(m, 1), m.index!));
  else scan(new RegExp((boundIntent?'(?:toi\\s+)?':'')+'(?:xuat phat\\s+)?tu\\s+(.+?)'+end,'dg'), m => city('departureCity', originalGroup(m, 1), m.index!));
  if (boundIntent) {
    scan(new RegExp('doi noi xuat phat (?:thanh|la)\\s+(.+?)'+end,'dg'), m => city('departureCity', originalGroup(m, 1), m.index!));
    scan(new RegExp('(?:toi\\s+)?khong di\\s+(?!o to\\b|xe may\\b|bang\\b)(.+?)'+end,'dg'), () => unknown('destinationCity'));
  }
  scan(/(?:toi\s+)?(?:khong di(?: bang)?\s+(?:o to|xe may)|chua chon phuong tien)/g, () => unknown('transportation'));
  scan(/(?:toi\s+)?(?:di bang\s+|di\s+|chon\s+)?(o to|xe may)(?=$|[\s,;.!])/g, m => add('transportation', m[1] === 'o to' ? 'car' : 'motorbike', m.index!));
  // Mentioned but unresolved values are not proof of omission.
  scan(/(\d+)\s+nguoi(?!\s+lon)/g, () => unknown('adults'));
  scan(new RegExp(num,'g'), () => unknown(intent.name === 'plan_trip' ? 'totalBudget' : 'dailyBudgetPerPerson'));
  for (const correction of corrections) {
    const before = seen[correction.field] || [];
    const distinct = new Set(before.map(x => fold(String(x.value))));
    if (uncertainFields[correction.field] || corrections.filter(x => x.field === correction.field).length !== 1 || distinct.size > 1 || before.some(x => x.start > correction.start) || correction.old && before.some(x => fold(String(x.value)) !== fold(correction.old!))) { unknown(correction.field, 'CONFLICT'); continue; }
    seen[correction.field] = [];
    for (let i = accentInsensitiveCities.length - 1; i >= 0; i--) if (accentInsensitiveCities[i] === correction.field) accentInsensitiveCities.splice(i, 1);
    if (correction.field === 'destinationCity') city(correction.field, correction.value, correction.start);
    else add(correction.field, correction.value, correction.start);
  }
  // Never erase an unmatched sign: otherwise -3 adults / -5tr becomes +3/+5tr.
  // Supported date/route hyphens have already been consumed by their clauses.
  const rest = s.split('').map((x, i) => mask[i] ? ' ' : x).join('').replace(/[\s,;.!]/gu, '');
  if (rest) return null;
  const values: Record<string, unknown> = {}, states: CurrentTurnProof['states'] = {};
  const spec = AGENT_TOOLS.find(x => x.name === intent.name)!;
  for (const field of spec.parameters.required) {
    const items = seen[field] || [], distinct = new Set(items.map(x => fold(String(x.value))));
    if (uncertainFields[field]) states[field] = uncertainFields[field];
    else if (distinct.size > 1) states[field] = 'CONFLICT';
    else if (items.length && items[0].value !== undefined) { states[field] = 'SET'; values[field] = items[0].value; }
    else states[field] = items.length ? 'UNPROVEN' : 'OMITTED';
  }
  if (seen.children?.length) {
    const children = new Set(seen.children.map(x => x.value));
    optionalStates.children = children.size === 1 ? 'SET' : 'CONFLICT';
    if (children.size === 1) optionalValues.children = seen.children[0].value;
  }
  // A recognized extra role cannot supply a different tool's required field.
  if (intent.name === 'search_places' && seen.transportation?.length) return null;
  return { toolName: intent.name, dialect: 'NATURAL', values, states, optionalValues, optionalStates, accentInsensitiveCities: [...new Set(accentInsensitiveCities)], valid: true };
}

const proofAjv = new Ajv({ allErrors: true, strict: true });
addFormats(proofAjv, ['date', 'uuid']);
const proofValidators = new Map(AGENT_TOOLS.map(spec => [spec.name, new Map(Object.entries(spec.parameters.properties).map(([field, schema]) => [field, proofAjv.compile(schema)]))]));
export function validateCurrentTurnProof(proof: CurrentTurnProof): CurrentTurnProof {
  for (const [field, value] of Object.entries(proof.values)) {
    if (!proofValidators.get(proof.toolName)!.get(field)!(value) || field === 'adults' && !Number.isSafeInteger(value) || (field === 'startDate' || field === 'endDate') && String(value).startsWith('0000-')) { proof.states[field] = 'UNPROVEN'; proof.valid = false; }
  }
  if (proof.values.startDate !== undefined && proof.values.endDate !== undefined) {
    try { calculatePlannerDays(proof.values.startDate, proof.values.endDate); } catch { proof.states.startDate = proof.states.endDate = 'UNPROVEN'; proof.valid = false; }
  }
  return proof;
}

/** The single shared proof result for execution, completeness and typed recovery. */
export function readCurrentTurnProof(message: string): CurrentTurnProof | null {
  return readProof(message);
}
/** Internal G2 entry: caller must already own a live server session. No defaults,
 * history concatenation or model-selected intent; all values remain current-only. */
export function readPendingTurnProof(message: string, pendingIntent: ToolName): CurrentTurnProof | null {
  return readProof(message, pendingIntent);
}
function readProof(message: string, boundIntent?: ToolName): CurrentTurnProof | null {
  if (typeof message !== 'string' || message.length > 2000 || isUnsafeCurrentMessage(message) || quoted(message)) return null;
  const original = message.normalize('NFC');
  const labeledProof = inspectLabeledSlots(original, boundIntent);
  if (labeledProof) {
    const states: CurrentTurnProof['states'] = { ...labeledProof.states };
    for (const field of Object.keys(states)) {
      const candidates = labeled(original, labels[field] || []);
      if (states[field] === 'UNPROVEN' && (new Set(candidates.map(fold)).size > 1 || labeledProof.values[field] !== undefined)) states[field] = 'CONFLICT';
      if ((field === 'departureCity' || field === 'destinationCity') && candidates.some(value => /\b(?:hoac|hay|va|voi)\b|[\/&]/u.test(ascii(value)))) states[field] = 'CONFLICT';
    }
    const optionalValues = Object.fromEntries(['children', 'category'].flatMap(field => { const value = observed(original, field); return value === undefined ? [] : [[field, value]]; }));
    const optionalStates = Object.fromEntries(['children', 'category'].flatMap(field => { const mentions = labeled(original, labels[field]); return mentions.length ? [[field, Object.hasOwn(optionalValues, field) ? 'SET' : new Set(mentions.map(fold)).size > 1 ? 'CONFLICT' : 'UNPROVEN']] : []; })) as Record<string, ProofState>;
    return validateCurrentTurnProof({ ...labeledProof, states, dialect: 'LABELED', optionalValues, optionalStates, accentInsensitiveCities: [], valid: true });
  }
  const natural = naturalProof(original, boundIntent);
  return natural ? validateCurrentTurnProof(natural) : null;
}

/** Compatibility view for existing internal three-state diagnostics only.
 * CONFLICT remains UNPROVEN here; actual authorization uses four-state proof. */
export function inspectCurrentRequiredSlots(message: string) {
  const proof = readCurrentTurnProof(message); if (!proof) return null;
  const states = Object.fromEntries(Object.entries(proof.states).map(([key, value]) => [key, value === 'CONFLICT' ? 'UNPROVEN' : value])) as Partial<Record<MissingField, 'SET' | 'OMITTED' | 'UNPROVEN'>>;
  return { toolName: proof.toolName, values: proof.values, states };
}
export function readCurrentRequiredSlots(message: string) {
  const proof = readCurrentTurnProof(message); return proof ? { toolName: proof.toolName, values: proof.values } : null;
}
export function readValidatedCurrentSlots(message: string) {
  const proof = readCurrentTurnProof(message); return proof?.valid ? { toolName: proof.toolName, values: proof.values } : null;
}

