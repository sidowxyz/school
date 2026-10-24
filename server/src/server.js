
// Load environment variables. When the process is started from the repository
// root (e.g. `node ../server/src/server.js`) `process.cwd()` may be the repo
// root, so prefer the `.env` file located in the server folder next to this
// file. Fall back to default dotenv behaviour if not present.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: serverEnvPath });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import mongoose from 'mongoose';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { hideServerErrors } from './middleware/hideServerErrors.js';

// A production server must not start half-configured: without these it would
// fall back to a local database or fail every sign-in with a 500.
if (process.env.NODE_ENV === 'production') {
  const missing = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}. See docs/DEPLOYMENT.md.`);
    process.exit(1);
  }
}
import reportRoutes from './routes/reportRoutes.js';

//  Auth & Core 
import authRoutes              from './routes/authRoutes.js';
import userRoutes              from './routes/userRoutes.js';
import roleRoutes              from './routes/roleRoutes.js';
import studentRoutes           from './routes/studentRoutes.js';
import parentRoutes            from './routes/parentRoutes.js';
import teacherRoutes           from './routes/teacherRoutes.js';
import teacherAssignmentRoutes from './routes/teacherAssignmentRoutes.js';
import assignmentRoutes        from './routes/assignmentRoutes.js';

//  Academic 
import yearRoutes              from './routes/yearRoutes.js';
import termRoutes              from './routes/termRoutes.js';
import levelRoutes             from './routes/levelRoutes.js';
import periodRoutes            from './routes/periodRoutes.js';
import classRoutes             from './routes/classRoutes.js';
import sectionRoutes           from './routes/sectionRoutes.js';
import subjectRoutes           from './routes/subjectRoutes.js';

// Attendance
import attendanceRoutes        from './routes/attendanceRoutes.js';
import staffAttendanceRoutes   from './routes/staffAttendanceRoutes.js';

// Teaching
import teachingLogRoutes       from './routes/teachingLogRoutes.js';

//  Finance 
import feeRoutes               from './routes/feeRoutes.js';
import monthlyFeeRoutes        from './routes/monthlyFeeRoutes.js';
import scholarshipRoutes       from './routes/scholarshipRoutes.js';

//  Portals 
import studentPortalRoutes     from './routes/studentPortalRoutes.js';
import parentPortalRoutes      from './routes/parentPortalRoutes.js';

//  Analytics & Settings 
import analyticsRoutes         from './routes/analyticsRoutes.js';
import systemSettingRoutes     from './routes/systemSettingRoutes.js';

//  Audit 
import auditRoutes             from './routes/auditRoutes.js';
import aiRoutes                from './routes/aiRoutes.js';

// 
// DATABASE
// 
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async (connected) => {
      if (!connected && process.env.NODE_ENV === 'production') {
        console.error('Could not connect to the database; exiting so the host restarts the service.');
        process.exit(1);
      }
      if (connected) {
        try {
          // System records only (never demo data) — see seed/bootstrap.js.
          const { bootstrap } = await import('./seed/bootstrap.js');
          await bootstrap();
        } catch (err) {
          console.warn('Bootstrap warning:', err.message);
        }
        const { startMonthlyChargeScheduler } = await import('./utils/monthlyChargeScheduler.js');
        await startMonthlyChargeScheduler();
      }
    })
    .catch(() => {
      // already handled inside connectDB, but keep the promise chain safe
    });
}

// 
// APP SETUP
// 
const app  = express();
const PORT = process.env.PORT || 5000;

// Render (and most hosts) sit behind one proxy. Trusting it gives the real
// visitor IP to the rate limiter; otherwise every visitor shares one limit.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// 1. Security
app.use(helmet());

// 2. CORS — must run before the rate limiter. Otherwise a 429 response never
// reaches this middleware, so it carries no Access-Control-Allow-Origin header
// and the browser reports it as a CORS failure instead of a rate limit.
// Deployed sites are listed in CORS_ORIGINS (comma-separated, e.g. the Vercel
// URL of this environment). Any localhost/127.0.0.1 port is allowed outside
// production (Vite picks 5173, 5174, 5175... depending on what's free, so a
// hard-coded port list breaks the moment another dev server is already running).
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
];
const isLocalhostOrigin = (origin) =>
  process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
      return callback(null, true);
    }
    const error = new Error('CORS Policy: Origin not allowed.');
    error.statusCode = 403;
    error.isOperational = true;
    callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// A single dashboard page load fires several parallel requests (list + reference
// data + KPIs, ...), so 100 req/15min per IP was exhausted almost immediately by
// normal browsing. Brute-force protection belongs on the auth endpoints
// specifically (see authRoutes.js), not as a blanket cap on API browsing.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// One access-log line per request (health pings excluded).
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/' || req.path === '/api/health' || process.env.NODE_ENV === 'test',
}));

// 3. Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Strip MongoDB operators ($gt, $ne, ...) from user input, and hide raw
// error details from 500 responses in production.
app.use(sanitizeInput);
app.use(hideServerErrors);

// Uploaded images (school logo, photos) are shown by the website, which lives
// on another domain, so they may be loaded cross-origin. Student documents are
// private: they are only served through GET /api/students/:id/documents/:docId/file.
app.use('/uploads/student-documents', (_req, res) => res.status(404).end());
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads'), { dotfiles: 'deny', index: false }));

// 
// 4. ROUTES
// 

// Health checks. "/" answers as long as the process is up; "/api/health"
// also needs the database, so the host can tell a broken deploy from a good one.
app.get('/', (_req, res) => res.json({ success: true, message: 'Server is running 🚀' }));
app.get('/api/health', (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.status(up ? 200 : 503).json({ success: up, database: up ? 'connected' : 'unavailable' });
});

// Auth & Users
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/roles',          roleRoutes);

// Core Entities
app.use('/api/students',       studentRoutes);
app.use('/api/parents',        parentRoutes);
app.use('/api/teachers',       teacherRoutes);
app.use('/api/teacher-assignments', teacherAssignmentRoutes);
app.use('/api/assignments',    assignmentRoutes);

// Academic
app.use('/api/years',          yearRoutes);
app.use('/api/terms',          termRoutes);
app.use('/api/levels',         levelRoutes);
app.use('/api/periods',        periodRoutes);
app.use('/api/classes',        classRoutes);
app.use('/api/sections',       sectionRoutes);
app.use('/api/subjects',       subjectRoutes);

// Attendance
app.use('/api/attendance',         attendanceRoutes);
app.use('/api/staff-attendance',   staffAttendanceRoutes);

// Teaching
app.use('/api/teaching-logs',             teachingLogRoutes);

// Finance
app.use('/api/fees',          monthlyFeeRoutes);
app.use('/api',               feeRoutes);
app.use('/api',               scholarshipRoutes);
app.use('/api/reports', reportRoutes);

// Portals
app.use('/api/portal/student', studentPortalRoutes);
app.use('/api/portal/parent',  parentPortalRoutes);

// Analytics & Settings
app.use('/api/v1/analytics',  analyticsRoutes);
app.use('/api/v1/settings',   systemSettingRoutes);

// Audit
app.use('/api/audit-logs',    auditRoutes);

// AI Assistant
app.use('/api/ai',            aiRoutes);

// 
// 5. GLOBAL ERROR HANDLER (must be last)
// 
// Unknown API routes answer in JSON like every other API error.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl.split('?')[0]}` });
});

app.use(errorHandler);

// 
// 6. START SERVER
// 
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
  });

  // Render (and most hosts) send SIGTERM before replacing the server: finish
  // the requests in flight, close the database, then exit.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    globalThis.setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
