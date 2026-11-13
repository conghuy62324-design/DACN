// OFFLINE_ONLY: build a diagnostic JSON Schema from the existing compiled contract.
// No network, database, inference, or production source mutation.
const fs = require('node:fs');
const path = require('node:path');
const { AGENT_TOOLS, FIELD_LABELS } = require('../dist/agent/tools.js');

const properties = {};
for (const tool of AGENT_TOOLS) {
  for (const [key, value] of Object.entries(tool.parameters.properties)) {
    if (Object.hasOwn(properties, key) && JSON.stringify(properties[key]) !== JSON.stringify(value)) {
      throw new Error(`Conflicting existing parameter contract: ${key}`);
    }
    properties[key] = value;
  }
}
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: {
    kind: { type: 'string', enum: ['tool', 'clarify', 'unsupported'] },
    name: { type: 'string', enum: AGENT_TOOLS.map(tool => tool.name) },
    fields: { type: 'array', minItems: 1, maxItems: 8,
      items: { type: 'string', enum: Object.keys(FIELD_LABELS) } },
    arguments: { type: 'object', additionalProperties: false, properties },
  },
};
const target = path.resolve(__dirname, '../../docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(schema, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ artifact: target, fields: Object.keys(FIELD_LABELS).length,
  tools: AGENT_TOOLS.map(tool => tool.name), argumentKeys: Object.keys(properties).length,
  note: 'DIAGNOSTIC_ONLY; runtime parseDecision/validateTool mandatory' }));
