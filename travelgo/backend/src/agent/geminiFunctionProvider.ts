import { HttpError } from '../utils/httpError.js';
import type { LlmProvider, ProviderRequest } from './provider.js';
import { AGENT_TOOLS, FIELD_LABELS } from './tools.js';
import { matchesDecisionSchema } from './decisionValidation.js';
import { externalJson } from '../services/externalJson.js';

export const PUBLIC_GEMINI_MODEL = 'gemini-3.8-flash';
// Separate provider cohort: old Ollama/system/schema/expected are not rewritten.
function schema(value: any): any {
  if (Array.isArray(value)) return value.map(schema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => !['additionalProperties','minLength','maxLength','format','exclusiveMinimum'].includes(k)).map(([k,v]) => [k,schema(v)]));
}
const declarations = [
  ...AGENT_TOOLS.map(t => ({ name: t.name, description: t.description, parameters: schema(t.parameters) })),
  { name: 'clarify', description: 'Ask for missing or contradictory required fields; never invent arguments.', parameters: { type: 'object', properties: { fields: { type: 'array', items: { type: 'string', enum: Object.keys(FIELD_LABELS) } } }, required: ['fields'] } },
  { name: 'unsupported', description: 'Unsupported, mutation or unsafe request.', parameters: { type: 'object', properties: {} } },
];
const mapsDeclarations = [
  {name:'get_user_location',description:'Ask the browser to show an explicit location consent button. Never obtain GPS automatically.'},
  {name:'search_places',description:'Search real Google Places using the current user query, not an invented query.'},
  {name:'get_place_details',description:'Details of the place explicitly selected by the user. Ask selection if absent.'},
  {name:'get_route',description:'Route for endpoints/mode explicitly selected in the UI. Ask inputs if absent.'},
].map(t=>({...t,parameters:{type:'object',properties:{}}}));
const publicDeclarations=[...mapsDeclarations,declarations.find(d=>d.name==='plan_trip')!,
  {name:'get_trip',description:'Read only the Trip explicitly selected by this authenticated user; never another account.',parameters:{type:'object',properties:{}}},
  {name:'save_or_update_trip',description:'Propose saving the server-generated Planner snapshot. Return confirmation preview; never mutate without a separate human confirmation.',parameters:{type:'object',properties:{}}},
  ...declarations.filter(d=>['clarify','unsupported'].includes(d.name))];
export class GeminiFunctionProvider implements LlmProvider {
  readonly configured = true; readonly external = true;
  constructor(private key: string, private expectedVersion: string, private fetcher: typeof fetch = fetch, private channel:'catalog'|'maps'|'public'='catalog') {}
  async generate(input: ProviderRequest, outer: AbortSignal): Promise<unknown> {
    const signal = AbortSignal.any([outer, AbortSignal.timeout(15000)]);
    const activeDeclarations=this.channel==='public'?publicDeclarations:this.channel==='maps'?mapsDeclarations:declarations;
    if (Buffer.byteLength(JSON.stringify({ system: input.system, messages: input.messages, declarations:activeDeclarations })) > 12288) throw new HttpError(400, 'Yêu cầu quá dài.', 'AGENT_INPUT_TOKEN_LIMIT');
    try {
      signal.throwIfAborted();
      const envelope = await externalJson(this.fetcher, `https://generativelanguage.googleapis.com/v1beta/models/${PUBLIC_GEMINI_MODEL}:generateContent`, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: input.system }] },
          contents: input.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          tools: [{ functionDeclarations: activeDeclarations }], toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: activeDeclarations.map(d => d.name) } },
          generationConfig: { maxOutputTokens: 2048 } }),
      }, 65536);
      const c = envelope.candidates?.[0], parts = c?.content?.parts;
      if (envelope.modelVersion !== this.expectedVersion || envelope.promptFeedback?.blockReason || envelope.candidates?.length !== 1 || c.finishReason !== 'STOP' || !Array.isArray(parts) || parts.length !== 1 || !parts[0].functionCall || parts[0].text || parts[0].thought) throw Error('INVALID_ENVELOPE');
      const call = parts[0].functionCall;
      if (!call.args || typeof call.args !== 'object' || Array.isArray(call.args)) throw Error('INVALID_ARGUMENTS');
      if(this.channel==='maps'||this.channel==='public'&&!['plan_trip','clarify','unsupported'].includes(call.name)){
        if(!activeDeclarations.some(d=>d.name===call.name)||Object.keys(call.args).length!==0)throw Error('UNVERIFIED_MAP_ARGUMENTS');
        signal.throwIfAborted();return{kind:'tool',name:call.name,arguments:{}};
      }
      if (call.name === 'clarify' && (Object.keys(call.args).length !== 1 || !Object.hasOwn(call.args,'fields'))) throw Error('INVALID_CLARIFICATION');
      const decision = call.name === 'clarify' ? { kind: 'clarify', fields: call.args.fields } : call.name === 'unsupported' && Object.keys(call.args).length === 0 ? { kind: 'unsupported' } : { kind: 'tool', name: call.name, arguments: call.args };
      if (!matchesDecisionSchema(decision)) throw Error('INVALID_DECISION');
      signal.throwIfAborted(); return decision;
    } catch (e) {
      if (signal.aborted) throw new HttpError(504, 'LLM chưa phản hồi kịp.', 'AGENT_TIMEOUT');
      if (e instanceof HttpError && e.statusCode === 429) throw new HttpError(429, 'Đã đạt giới hạn dịch vụ AI.', 'AGENT_PROVIDER_QUOTA');
      throw new HttpError(502, 'Không nhận được function call hợp lệ từ Gemini.', 'AGENT_INVALID_PROVIDER_OUTPUT');
    }
  }
}
