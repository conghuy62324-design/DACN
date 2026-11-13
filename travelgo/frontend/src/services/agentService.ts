import { api } from './api';
import type { AgentChatRequest } from '../types/agent';
import { acceptTurnMetadata, parseAgentPrivacy, parseAgentResponse, parseConversationMetadata, parseG2Privacy, projectAgentRequest } from '../utils/agentContract';

function client(token?: string) {
  const config = (signal: AbortSignal) => ({ signal, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) });
  const revoked = (value: any) => {
    if (value?.success !== true || value.data?.revoked !== true || Object.keys(value.data).some(k => k !== 'revoked')) throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
  };
  return {
    async privacy(signal: AbortSignal) { return parseAgentPrivacy(await api.get('/agent/privacy', config(signal))); },
    async verifiedPrivacy(signal: AbortSignal) { return parseG2Privacy(await api.get('/agent/verified-history/privacy', config(signal))); },
    async chat(input: AgentChatRequest, signal: AbortSignal) {
      const body = projectAgentRequest(input);
      const response = parseAgentResponse(await api.post('/agent/chat', body, { ...config(signal), timeout: 60000 }));
      if (body.conversation) {
        if (response.context.mode !== 'LOCAL_DEMO_VERIFIED_HISTORY') throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
        acceptTurnMetadata(response.conversation, body.conversation);
      } else if (response.context.mode !== 'STATELESS') throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
      return response;
    },
    async reset(id: string, signal: AbortSignal) {
      const value: any = await api.post(`/agent/verified-history/${encodeURIComponent(id)}/reset`, {}, { ...config(signal), timeout: 5000 });
      if (value?.success !== true) throw { status: 502, code: 'AGENT_INVALID_RESPONSE' };
      return parseConversationMetadata(value.data);
    },
    async revoke(id: string, signal: AbortSignal) { revoked(await api.delete(`/agent/verified-history/${encodeURIComponent(id)}`, { ...config(signal), timeout: 5000 })); },
    async revokeAll(signal: AbortSignal) { revoked(await api.delete('/agent/verified-history', { ...config(signal), timeout: 5000 })); },
  };
}
export const AgentService = { ...client(), forSession: client };
