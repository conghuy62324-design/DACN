import { Router } from 'express';
import { TicketController } from '../controllers/ticketController.js';

const router = Router();

router.get('/', TicketController.getTickets);
router.get('/:id', TicketController.getTicketById);

export default router;
