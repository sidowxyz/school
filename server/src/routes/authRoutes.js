import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema } from '../validators/authValidator.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// Credential-guessing protection lives here, scoped to the endpoints that
// actually need it — not as a blanket limit on the whole API (see server.js).
// Failed sign-ins are limited per IP and email, so one wrong password in a
// computer lab doesn't lock out every other pupil on the same connection.
// Accounts are created by staff (there is no self sign-up), and a forgotten
// password is reset by an admin on the User Accounts page.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').toLowerCase()}`,
  message: { success: false, message: 'Too many failed sign-in attempts. Wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/login',             loginLimiter, validate(loginSchema),          login);
router.post('/refresh',           sessionLimiter, refreshToken);
router.post('/logout',            sessionLimiter, logout);

// Protected routes (token required)
router.get('/me',                 authenticate, getCurrentUser);
router.post('/change-password',   sessionLimiter, authenticate, validate(changePasswordSchema), changePassword);

export default router;