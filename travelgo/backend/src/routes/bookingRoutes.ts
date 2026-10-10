import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { validateBookingRequest } from '../validators/validators.js';

const router = Router();

router.post('/', validateBookingRequest, BookingController.createBooking);
router.get('/', BookingController.getBookings);
router.get('/:code', BookingController.getBookingByCode);
router.patch('/:id/status', BookingController.updateStatus);

export default router;
