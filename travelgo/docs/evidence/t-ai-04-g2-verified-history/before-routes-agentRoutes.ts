import { Router, type ErrorRequestHandler } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { agentChatController } from '../controllers/agentController.js';
import { AgentOrchestrator, agentService } from '../services/agentService.js';
import { HttpError } from '../utils/httpError.js';
import { AGENT_PRIVACY_NOTICE } from '../agent/privacy.js';

export function createAgentRouter(service: AgentOrchestrator = agentService) {
  const router = Router();
  router.get('/privacy', authenticate, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: AGENT_PRIVACY_NOTICE });
  });
  router.post('/chat', authenticate, agentChatController(service));
  // Do not pass provider/database exceptions to the global logger or development stack response.
  const safeError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader('Cache-Control', 'no-store');
    const safe = error instanceof HttpError && (error.code?.startsWith('AGENT_') ||
      ['AUTH_REQUIRED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(error.code || ''));
    res.status(safe ? error.statusCode : 500).json({ success: false,
      code: safe ? error.code : 'AGENT_INTERNAL_ERROR',
      message: safe ? error.message : 'Không thể xử lý yêu cầu Agent.' });
  };
  router.use(safeError);
  return router;
}
export default createAgentRouter();
