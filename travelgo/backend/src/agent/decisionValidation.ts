import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { DECISION_SCHEMA } from './decisionSchema.js';

// Compile the actual production schema once. JSON mode constrains syntax only;
// this check must precede the existing semantic/runtime validators.
const ajv = new Ajv({ allErrors: false, strict: true });
addFormats(ajv, ['date', 'uuid']);
const validate = ajv.compile(DECISION_SCHEMA);

export function matchesDecisionSchema(value: unknown): boolean {
  return validate(value);
}
