
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

import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import reportRoutes from './routes/reportRoutes.js';

//  Auth & Core 
import authRoutes              from './routes/authRoutes.js';
import userRoutes              from './routes/userRoutes.js';
import studentRoutes           from './routes/studentRoutes.js';
import familyRoutes            from './routes/familyRoutes.js';
import parentRoutes            from './routes/parentRoutes.js';
import teacherRoutes           from './routes/teacherRoutes.js';
import teacherAssignmentRoutes from './routes/teacherAssignmentRoutes.js';
import assignmentRoutes        from './routes/assignmentRoutes.js';
import staffRoutes             from './routes/staffRoutes.js';

//  Academic 
import yearRoutes              from './routes/yearRoutes.js';
import termRoutes              from './routes/termRoutes.js';
import levelRoutes             from './routes/levelRoutes.js';
import periodRoutes            from './routes/periodRoutes.js';
import classRoutes             from './routes/classRoutes.js';
import sectionRoutes           from './routes/sectionRoutes.js';
import subjectRoutes           from './routes/subjectRoutes.js';
import courseClassRoutes       from './routes/courseClassRoutes.js';
import syllabusRoutes          from './routes/syllabusRoutes.js';
import timetableRoutes         from './routes/timetableRoutes.js';

// Attendance
import attendanceRoutes        from './routes/attendanceRoutes.js';
import staffAttendanceRoutes   from './routes/staffAttendanceRoutes.js';

// Teaching
import teachingLogRoutes       from './routes/teachingLogRoutes.js';
import lessonCoverageRoutes    from './routes/lessonCoverageRoutes.js';
import lessonCoverageReportRoutes from './routes/lessonCoverageReportRoutes.js';

//  Finance 
import feeRoutes               from './routes/feeRoutes.js';
import monthlyFeeRoutes        from './routes/monthlyFeeRoutes.js';
import refundRoutes            from './routes/refundRoutes.js';
import scholarshipRoutes       from './routes/scholarshipRoutes.js';
import ledgerRoutes            from './routes/ledgerRoutes.js';
import chartOfAccountRoutes    from './routes/chartOfAccountRoutes.js';
import fiscalPeriodRoutes      from './routes/fiscalPeriodRoutes.js';
import journalEntryRoutes      from './routes/journalEntryRoutes.js';
import expenseRoutes           from './routes/expenseRoutes.js';
import fixedAssetRoutes        from './routes/fixedAssetRoutes.js';
import financialReportRoutes   from './routes/financialReportRoutes.js';

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

// 1. Security
app.use(helmet());

// 2. CORS — must run before the rate limiter. Otherwise a 429 response never
// reaches this middleware, so it carries no Access-Control-Allow-Origin header
// and the browser reports it as a CORS failure instead of a rate limit.
// Explicit production origins, plus any localhost/127.0.0.1 port in development
// (Vite picks 5173, 5174, 5175... depending on what's free, so a hard-coded port
// list breaks the moment another dev server is already running).
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS Policy: Origin not allowed.'));
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

// 3. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 
// 4. ROUTES
// 

// Health check
app.get('/', (_req, res) => res.json({ success: true, message: 'Server is running 🚀' }));

// Auth & Users
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);

// Core Entities
app.use('/api/students',       studentRoutes);
app.use('/api/families',       familyRoutes);
app.use('/api/parents',        parentRoutes);
app.use('/api/teachers',       teacherRoutes);
app.use('/api/teacher-assignments', teacherAssignmentRoutes);
app.use('/api/assignments',    assignmentRoutes);
app.use('/api/staff',          staffRoutes);

// Academic
app.use('/api/years',          yearRoutes);
app.use('/api/academic-years', yearRoutes);
app.use('/api/terms',          termRoutes);
app.use('/api/levels',         levelRoutes);
app.use('/api/periods',        periodRoutes);
app.use('/api/classes',        classRoutes);
app.use('/api/sections',       sectionRoutes);
app.use('/api/subjects',       subjectRoutes);
app.use('/api/course-classes', courseClassRoutes);
app.use('/api/syllabus',       syllabusRoutes);
app.use('/api/timetable',      timetableRoutes);

// Attendance
app.use('/api/attendance',         attendanceRoutes);
app.use('/api/staff-attendance',   staffAttendanceRoutes);

// Teaching
app.use('/api/teaching-logs',             teachingLogRoutes);
app.use('/api/lesson-coverage',           lessonCoverageRoutes);
app.use('/api/lesson-coverage-reports',   lessonCoverageReportRoutes);

// Finance
app.use('/api/fees',          monthlyFeeRoutes);
app.use('/api',               feeRoutes);
app.use('/api',               scholarshipRoutes);
app.use('/api/refunds',       refundRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ledger',        ledgerRoutes);
app.use('/api/chart-of-accounts', chartOfAccountRoutes);
app.use('/api/fiscal-periods', fiscalPeriodRoutes);
app.use('/api/journal-entries', journalEntryRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/fixed-assets',  fixedAssetRoutes);
app.use('/api/financial-reports', financialReportRoutes);

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
app.use(errorHandler);

// 
// 6. START SERVER
// 
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
  });
}

export default app;
