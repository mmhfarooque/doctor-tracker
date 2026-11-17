import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { MongoRateLimitStore } from './utils/rateLimitStore.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mongoSanitizeMiddleware } from './middleware/sanitizeMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Bound database work even when substring searches cannot use a B-tree index.
mongoose.set('maxTimeMS', 2000);
const app = express();
// Trust reverse proxy for accurate IP identification in rate limiters (VPS / Nginx)
app.set('trust proxy', process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : (process.env.VERCEL ? 1 : false));

// Obfuscate server technology fingerprint
app.disable('x-powered-by');

// 1. Helmet HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Clinical Data Anti-Caching Headers (prevents intermediate and browser disk storage of sensitive medical data)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// 2. CORS Configuration with origin validation
// CLIENT_URL may hold several comma-separated origins (e.g. the Vercel production URL and a custom domain)
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(',').map((o) => o.trim()),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile, server-side tools) or matching allowed list
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Rate Limiting to prevent DoS and Brute Force
// Signed-in admins are limited per user, not per IP: a hospital's staff usually share one office IP,
// and an IP-wide limit would let one busy colleague lock everyone out. Anonymous traffic is limited per IP.
const userOrIpKey = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (id) return `user:${id}`;
    } catch {
      // invalid or expired token: fall through to the IP bucket
    }
  }
  return `ip:${ipKeyGenerator(req.ip)}`;
};

const apiLimiter = rateLimit({
  ...(process.env.NODE_ENV === 'production' ? { store: new MongoRateLimitStore('api') } : {}),
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (req) => (userOrIpKey(req).startsWith('user:') ? 1500 : 300),
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a few minutes and try again.',
  },
});

const authLimiter = rateLimit({
  ...(process.env.NODE_ENV === 'production' ? { store: new MongoRateLimitStore('auth') } : {}),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Max 25 login/register attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Body Parsers with payload limits & NoSQL / Parameter Pollution Sanitization
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(mongoSanitizeMiddleware);
app.use(hpp());

// Logging
if (process.env.NODE_ENV !== 'test') {
  // Log the path only: query strings carry search terms such as patient names (protected health information)
  morgan.token('path', (req) => req.route?.path ? String(req.baseUrl || '') + req.route.path : '/unmatched');
  app.use(morgan(':method :path :status :res[content-length] - :response-time ms'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'healthy' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'Doctor Tracker REST API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);
app.use('/api', activityRoutes); // /api/activity, /api/alerts

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

// Central Error Handler
app.use(errorHandler);

export default app;
