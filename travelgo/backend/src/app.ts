import {startTravelWebWorker} from './services/travelWebWorker.js';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ENV } from './config/env.js';
import {startReviewInsightWorker} from './services/reviewInsightService.js';

const app = express();
startReviewInsightWorker();
startTravelWebWorker();

// Middlewares
app.use(cors({
  origin(origin, callback) {
    if (!origin || ENV.APP_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Origin không được HuGo Travel cho phép'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key','If-Match'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({event:'HTTP_REQUEST',method:req.method,status:res.statusCode,durationMs:duration}));
  });
  next();
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với HuGo Travel Backend API! (MVC Architecture)',
    docs: '/api/health',
    endpoints: [
      '/api/places',
      '/api/tickets',
      '/api/bookings',
      '/api/blogs',
      '/api/auth',
      '/api/stats',
    ],
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Đường dẫn API không tồn tại.',
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
