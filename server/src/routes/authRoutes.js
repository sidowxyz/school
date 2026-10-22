import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  changePassword
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../validators/authValidator.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// Credential-guessing protection lives here, scoped to the endpoints that
// actually need it — not as a blanket limit on the whole API (see server.js).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register',          validate(registerSchema),       register);
router.post('/login',             authLimiter, validate(loginSchema),          login);
router.post('/refresh',           refreshToken);
router.post('/logout',            logout);
router.post('/forgot-password',   authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), resetPassword);

// Protected routes (token required)
router.get('/me',                 authenticate, getCurrentUser);
router.post('/change-password',   authenticate, validate(changePasswordSchema), changePassword);

// Health check
router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'Auth routes are working' });
});

export default router;