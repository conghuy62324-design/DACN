import { AgentLimits } from './limits.js';
// All production Agent HTTP entry points share one principal/concurrency budget.
export const agentRequestLimits = new AgentLimits(20, 1);
