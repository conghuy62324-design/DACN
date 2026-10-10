import { Router } from 'express';
import placeRoutes from './placeRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import blogRoutes from './blogRoutes.js';
import authRoutes from './authRoutes.js';
import statsRoutes from './statsRoutes.js';
import tourRoutes from './tourRoutes.js';
import tripRoutes from './tripRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HuGo Travel API Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'PostgreSQL + PostGIS Ready (MVC Architecture Active)',
    ratingEngine: 'Bayesian Average Algorithm Active',
    plannerEngine: 'Heuristic & Geo Clustering Recommendation Active',
  });
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

export default router;

