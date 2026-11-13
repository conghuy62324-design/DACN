import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { AgentOrchestrator, agentService } from '../services/agentService.js';

export function agentChatController(service: AgentOrchestrator = agentService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json({ success: true, data: await service.chat(req.user, req.body) }); }
    catch (error) { next(error); }
  };
}
