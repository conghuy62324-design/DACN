import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { AgentOrchestrator, agentService } from '../services/agentService.js';
import { agentRequestHeader } from '../agent/postgresAgentLimits.js';

export function agentChatController(service: AgentOrchestrator = agentService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    const abort=new AbortController();
    const cancel=()=>{if(!res.writableEnded)abort.abort();};
    res.on('close',cancel);
    try { res.json({ success: true, data: await service.chat(req.user, req.body, abort.signal,
      agentRequestHeader(req.header('Idempotency-Key'))) }); }
    catch (error) { next(error); }
    finally { res.off('close',cancel); }
  };
}
