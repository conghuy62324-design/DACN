import { Router } from 'express';
import placeRoutes from './placeRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import blogRoutes from './blogRoutes.js';
import authRoutes from './authRoutes.js';
import statsRoutes from './statsRoutes.js';
import tourRoutes from './tourRoutes.js';
import tripRoutes from './tripRoutes.js';
import adminRoutes from './adminRoutes.js';
import partnerRoutes from './partnerRoutes.js';
import partnerApplicationRoutes from './partnerApplicationRoutes.js';
import intelligenceRoutes from './intelligenceRoutes.js';
import { sequelize } from '../config/database.js';

const router = Router();

// Health check endpoint
router.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status:'ok',service:'HuGo Travel API Backend',timestamp:new Date().toISOString(),version:'1.0.0',database:'connected',ratingEngine:'Bayesian Average Algorithm Active',plannerEngine:'Heuristic & Geo Clustering Recommendation Active' });
  } catch {
    res.status(503).json({ success:false,status:'degraded',error:{code:'DATABASE_UNAVAILABLE',message:'PostgreSQL không khả dụng'} });
  }
});

// Resource endpoints
router.use('/places', placeRoutes);
router.use('/tickets', ticketRoutes);
router.use('/bookings', bookingRoutes);
router.use('/blogs', blogRoutes);
router.use('/auth', authRoutes);
router.use('/stats', statsRoutes);
router.use('/tours', tourRoutes);
router.use('/trips', tripRoutes);
router.use('/admin', adminRoutes);
router.use('/partner', partnerRoutes);
router.use('/partner-applications', partnerApplicationRoutes);
router.use('/intelligence', intelligenceRoutes);

export default router;

