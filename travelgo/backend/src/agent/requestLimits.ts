import { ENV } from '../config/env.js';
import { AgentLimits, type AgentRequestLimits } from './limits.js';
import { agentStateUnavailable, openAgentCoordination } from './postgresAgentLimits.js';

let postgres: ReturnType<typeof openAgentCoordination> | undefined;
const production=ENV.NODE_ENV==='production';
const mode=process.env.AGENT_SHARED_STATE_MODE;
const disabled: AgentRequestLimits={
  consume:()=>{throw agentStateUnavailable();},
  providerCall:async()=>{throw agentStateUnavailable();},
};
if(mode==='postgres'){
  try { postgres=openAgentCoordination(process.env,production); }
  catch { /* Configuration failures surface as protected-route 503s. */ }
}

// Production cannot opt into a fresh per-process allowance during an outage.
// Local limits are available only for existing development/test flows.
export const agentRequestLimits: AgentRequestLimits=postgres?.limits ??
  (!production&&(mode===undefined||mode==='local')?new AgentLimits(20,1):disabled);

export async function closeAgentSharedState(){await postgres?.close();}
