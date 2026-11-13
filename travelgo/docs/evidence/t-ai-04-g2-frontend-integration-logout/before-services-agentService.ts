import { api } from './api';
import type { AgentChatRequest } from '../types/agent';
import { parseAgentPrivacy, parseAgentResponse } from '../utils/agentContract';

export const AgentService = {
  async privacy(signal: AbortSignal) {
    return parseAgentPrivacy(await api.get('/agent/privacy', { signal }));
  },
  async chat(input: AgentChatRequest, signal: AbortSignal) {
    // Explicit projection prevents account/profile or incidental UI state entering the prompt.
    const body: AgentChatRequest = { message: input.message, history: (input.history || []).map(m => ({ role: m.role, content: m.content })),
      ...(input.externalProcessingConsent ? { externalProcessingConsent: input.externalProcessingConsent } : {}) };
    return parseAgentResponse(await api.post('/agent/chat', body, { signal, timeout: 60000 }));
  },
};
