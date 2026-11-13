import { Router, type ErrorRequestHandler } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { agentChatController } from '../controllers/agentController.js';
import { AgentOrchestrator, agentService } from '../services/agentService.js';
import { HttpError } from '../utils/httpError.js';
import { AGENT_PRIVACY_NOTICE } from '../agent/privacy.js';
import { G2HttpError, G2_PRIVACY_NOTICE } from '../agent/verifiedHistory.js';
import { object, onlyKeys } from '../agent/conversation.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { createAgentCoreRouter } from './agentCoreRoutes.js';

export function createAgentRouter(service: AgentOrchestrator = agentService) {
  const router = Router();
  router.use('/core',createAgentCoreRouter());
  router.get('/privacy', authenticate, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: AGENT_PRIVACY_NOTICE });
  });
  router.post('/chat', authenticate, agentChatController(service));
  router.get('/verified-history/privacy', authenticate, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: { ...G2_PRIVACY_NOTICE, enabled: service.verifiedHistoryEnabled() } });
  });
  router.post('/verified-history/:id/reset', authenticate, (req: AuthenticatedRequest, res, next) => {
    try { onlyKeys(object(req.body || {}), []); res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: service.resetVerifiedHistory(req.user, String(req.params.id)) }); } catch (error) { next(error); }
  });
  router.delete('/verified-history/:id', authenticate, (req: AuthenticatedRequest, res, next) => {
    try { onlyKeys(object(req.body || {}), []); res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: service.revokeVerifiedHistory(req.user, String(req.params.id)) }); } catch (error) { next(error); }
  });
  router.delete('/verified-history', authenticate, (req: AuthenticatedRequest, res, next) => {
    try { onlyKeys(object(req.body || {}), []); res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: service.revokeVerifiedHistory(req.user) }); } catch (error) { next(error); }
  });
  // Do not pass provider/database exceptions to the global logger or development stack response.
  const safeError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader('Cache-Control', 'no-store');
    const safe = error instanceof HttpError && (error.code?.startsWith('AGENT_') ||
      ['AUTH_REQUIRED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(error.code || ''));
    res.status(safe ? error.statusCode : 500).json({ success: false,
      code: safe ? error.code : 'AGENT_INTERNAL_ERROR',
      message: safe ? error.message : 'Không thể xử lý yêu cầu Agent.',
      ...(safe && error instanceof G2HttpError && error.conversation ? { conversation: error.conversation } : {}) });
  };
  router.use(safeError);
  return router;
}
export default createAgentRouter();
