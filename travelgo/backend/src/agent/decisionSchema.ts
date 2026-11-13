import { AGENT_TOOLS, FIELD_LABELS } from './tools.js';

// JSON schema constrains generation; parseDecision/validateTool remain authoritative.
export const DECISION_SCHEMA = {
  anyOf: [
    { type: 'object', additionalProperties: false, required: ['kind', 'fields'], properties: {
      kind: { type: 'string', enum: ['clarify'] }, fields: { type: 'array', minItems: 1, maxItems: 8,
        items: { type: 'string', enum: Object.keys(FIELD_LABELS) } },
    } },
    ...AGENT_TOOLS.map(tool => ({ type: 'object', additionalProperties: false,
      required: ['kind', 'name', 'arguments'], properties: {
        kind: { type: 'string', enum: ['tool'] }, name: { type: 'string', enum: [tool.name] }, arguments: tool.parameters,
      } })),
    { type: 'object', additionalProperties: false, required: ['kind'], properties: { kind: { type: 'string', enum: ['unsupported'] } } },
  ],
};

// Google's documented JSON Schema subset omits string lengths/exclusiveMinimum.
// Keep strict validation locally; never relax validateTool to match generation hints.
function geminiSubset(value: any): any {
  if (Array.isArray(value)) return value.map(geminiSubset);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    if (key === 'minLength' || key === 'maxLength') return [];
    if (key === 'exclusiveMinimum') return [['minimum', child]];
    return [[key, geminiSubset(child)]];
  }));
}
export const GEMINI_DECISION_SCHEMA = geminiSubset(DECISION_SCHEMA);
