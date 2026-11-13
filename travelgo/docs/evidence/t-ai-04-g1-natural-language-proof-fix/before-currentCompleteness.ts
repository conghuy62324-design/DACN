import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AGENT_TOOLS, type MissingField, type ToolName } from './tools.js';
import { inspectCurrentRequiredSlots, readCurrentRequiredSlots } from './toolProvenance.js';
import { calculatePlannerDays } from '../utils/plannerValidation.js';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv, ['date', 'uuid']);
const fields = new Map(AGENT_TOOLS.map(spec => [spec.name,
  new Map(Object.entries(spec.parameters.properties).map(([name, schema]) => [name, ajv.compile(schema)]))]));

/** Shared with typed recovery: exact original schemas/date rules and existing
 * current-only reader. No coercion, defaults, inference, mutation or history. */
export function readValidatedCurrentSlots(message: string) {
  const context = readCurrentRequiredSlots(message);
  if (!context) return null;
  for (const [field, value] of Object.entries(context.values)) {
    if (!fields.get(context.toolName)!.get(field)!(value)) return null;
    if (field === 'adults' && !Number.isSafeInteger(value)) return null;
    if ((field === 'startDate' || field === 'endDate') && String(value).startsWith('0000-')) return null;
  }
  if (context.values.startDate !== undefined && context.values.endDate !== undefined) {
    try { calculatePlannerDays(context.values.startDate, context.values.endDate); } catch { return null; }
  }
  return context;
}

type ProvenSlots = { toolName: ToolName; states: Partial<Record<MissingField, 'SET' | 'OMITTED' | 'UNPROVEN'>> };
export type CompletenessAssessment =
  { status: 'SUPPORTED_INCOMPLETE'; toolName: ToolName; missingFields: readonly MissingField[]; states: ProvenSlots['states'] } |
  { status: 'COMPLETE'; toolName: ToolName; states: ProvenSlots['states'] } |
  { status: 'UNDETERMINED'; reason: 'OUTSIDE_PROVEN_GRAMMAR' | 'UNPROVEN_FIELD' | 'INVALID_OBSERVATION' } |
  { status: 'UNSUPPORTED'; reason: 'EXPLICIT_MUTATION_COMMAND' };

/** Four-state assessor, deliberately NOT a general NLU parser. UNSUPPORTED is
 * diagnostic only for exact standalone commands already outside AGENT_TOOLS;
 * the orchestrator never uses it to synthesize an unsupported response. */
export function assessCurrentCompleteness(message: string): CompletenessAssessment {
  if (typeof message === 'string' && /^(?:lưu trip|save trip|tạo booking|xóa trip|xóa booking|sửa trip|sửa booking)[.!?]?$/iu.test(message.trim())) {
    return { status: 'UNSUPPORTED', reason: 'EXPLICIT_MUTATION_COMMAND' };
  }
  const inspected = inspectCurrentRequiredSlots(message);
  if (!inspected) return { status: 'UNDETERMINED', reason: 'OUTSIDE_PROVEN_GRAMMAR' };
  if (Object.values(inspected.states).includes('UNPROVEN')) return { status: 'UNDETERMINED', reason: 'UNPROVEN_FIELD' };
  const context = readValidatedCurrentSlots(message);
  if (!context) return { status: 'UNDETERMINED', reason: 'INVALID_OBSERVATION' };
  const spec = AGENT_TOOLS.find(tool => tool.name === context.toolName)!;
  const missingFields = spec.parameters.required.filter(field => context.values[field] === undefined) as MissingField[];
  const states = Object.freeze({ ...inspected.states });
  return missingFields.length ? { status: 'SUPPORTED_INCOMPLETE', toolName: spec.name, missingFields: Object.freeze(missingFields), states } :
    { status: 'COMPLETE', toolName: spec.name, states };
}

export type DecisionOriginEvent = Readonly<{
  source: 'agent_decision_origin'; correlationId: string;
  origin: 'SERVER_COMPLETENESS' | 'MODEL' | 'MODEL_REJECTED_RECOVERY';
  assessment: CompletenessAssessment['status']; providerInvoked: boolean;
  rawNlu: 'NOT_EVALUATED' | 'FAIL' | 'REQUIRES_EXPECTED_COMPARISON';
}>;
