import { AGENT_TOOLS, type MissingField, type ToolName } from './tools.js';
import { readCurrentTurnProof, type ProofState } from './currentTurnProof.js';
export { readValidatedCurrentSlots } from './currentTurnProof.js';

type ProvenSlots = { toolName: ToolName; states: Partial<Record<MissingField, ProofState>> };
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
  const inspected = readCurrentTurnProof(message);
  if (!inspected) return { status: 'UNDETERMINED', reason: 'OUTSIDE_PROVEN_GRAMMAR' };
  if (!inspected.valid) return { status: 'UNDETERMINED', reason: 'INVALID_OBSERVATION' };
  if (Object.values(inspected.states).some(state => state === 'UNPROVEN' || state === 'CONFLICT')) return { status: 'UNDETERMINED', reason: 'UNPROVEN_FIELD' };
  const context = inspected;
  const spec = AGENT_TOOLS.find(tool => tool.name === context.toolName)!;
  const missingFields = spec.parameters.required.filter(field => context.values[field] === undefined) as MissingField[];
  const states = Object.freeze({ ...inspected.states });
  return missingFields.length ? { status: 'SUPPORTED_INCOMPLETE', toolName: spec.name, missingFields: Object.freeze(missingFields), states } :
    { status: 'COMPLETE', toolName: spec.name, states };
}

export type DecisionOriginEvent = Readonly<{
  source: 'agent_decision_origin'; correlationId: string;
  origin: 'SERVER_COMPLETENESS' | 'VERIFIED_HISTORY_COMPLETENESS' | 'MODEL' | 'MODEL_REJECTED_RECOVERY';
  assessment: CompletenessAssessment['status']; providerInvoked: boolean;
  rawNlu: 'NOT_EVALUATED' | 'FAIL' | 'REQUIRES_EXPECTED_COMPARISON';
}>;
