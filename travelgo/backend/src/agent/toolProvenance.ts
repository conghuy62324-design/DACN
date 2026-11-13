import { AGENT_TOOLS, parseDecision, validateTool, type MissingField, type ToolDecision } from './tools.js';
import { readCurrentTurnProof, matchesCurrentProof, isUnsafeCurrentMessage, type CurrentTurnProof } from './currentTurnProof.js';
export { readCurrentRequiredSlots, inspectCurrentRequiredSlots } from './currentTurnProof.js';

export type ProvenanceResult = { status: 'ALLOW' } |
  { status: 'NEEDS_INPUT'; missing: MissingField[] } | { status: 'REJECT' };

/** Model arguments are compared to independent current-message proof only.
 * The same four-state reader drives completeness and recovery. Never repair args. */
export function checkToolProvenance(decision: ToolDecision, currentMessage: string): ProvenanceResult {
  if (typeof currentMessage !== 'string' || isUnsafeCurrentMessage(currentMessage)) return { status: 'REJECT' };
  return checkDecisionAgainstProof(decision, readCurrentTurnProof(currentMessage));
}
/** Internal server seam: only G2's owned, live lease calls this with its merged
 * proof. HTTP input never supplies this object; validators remain mandatory. */
export function checkDecisionAgainstProof(decision: ToolDecision, proof: CurrentTurnProof | null): ProvenanceResult {
  try {
    const parsed = parseDecision(decision);
    if (parsed.kind !== 'tool') return { status: 'REJECT' };
    validateTool(parsed);
  } catch { return { status: 'REJECT' }; }
  const spec = AGENT_TOOLS.find(tool => tool.name === decision.name);
  if (!spec) return { status: 'REJECT' };
  if (!proof || proof.toolName !== spec.name) return { status: 'NEEDS_INPUT', missing: [...spec.parameters.required] as MissingField[] };
  const missing = spec.parameters.required.filter(field => proof.states[field] !== 'SET' ||
    proof.values[field] === undefined || !matchesCurrentProof(proof, field, decision.arguments[field])) as MissingField[];
  if (missing.length) return { status: 'NEEDS_INPUT', missing };
  for (const [field, actual] of Object.entries(decision.arguments)) {
    if ((spec.parameters.required as readonly string[]).includes(field)) continue;
    if (proof.optionalStates?.[field]) {
      if (proof.optionalStates[field] !== 'SET' || !matchesCurrentProof(proof, field, actual)) return { status: 'REJECT' };
      continue;
    }
    const harmlessDefault = field === 'children' && actual === 0 || field === 'pacing' && actual === 'balanced' ||
      field === 'preferences' && Array.isArray(actual) && actual.length === 0;
    if (!harmlessDefault && !matchesCurrentProof(proof, field, actual)) return { status: 'REJECT' };
  }
  return { status: 'ALLOW' };
}
