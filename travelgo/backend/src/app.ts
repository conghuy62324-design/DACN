import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
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
    message: `Đường dẫn API '${req.originalUrl}' không tồn tại.`,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
