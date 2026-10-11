import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { validateSecureBookingRequest } from '../validators/validators.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.post('/', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), validateSecureBookingRequest, BookingController.createBooking);
router.get('/my', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.getMyBookings);
router.get('/', requireRoles('SUPER_ADMIN'), BookingController.getBookings);
router.post('/:id/cancel', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.cancel);
router.get('/:code', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.getBookingByCode);
router.patch('/:id/status', requireRoles('SUPER_ADMIN'), BookingController.updateStatus);

export default router;
