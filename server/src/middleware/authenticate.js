import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

// Students and parents only ever use their own portal. Everything else is
// closed to them here, in one place, so a staff route that forgets its
// authorize() check can never leak school-wide data to a portal account.
// The few shared reads they need: school name/logo, academic years (top bar).
const PORTAL_PREFIX = { student: '/api/portal/student', parent: '/api/portal/parent' };
const PORTAL_SHARED = ['/api/auth', '/api/ai'];
const PORTAL_READS = ['/api/v1/settings', '/api/years'];

const under = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

const portalMayUse = (role, req) => {
  const path = req.originalUrl.split('?')[0];
  if (under(path, PORTAL_PREFIX[role])) return true;
  if (PORTAL_SHARED.some((p) => under(path, p))) return true;
  return req.method === 'GET' && PORTAL_READS.some((p) => under(path, p));
};

export const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return next(new AppError('Not authorized, token failed or expired', 401));
  }

  try {
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Reject deactivated accounts even if they hold a still-valid token.
    if (currentUser.status === false) {
      return next(new AppError('This account has been deactivated.', 401));
    }

    if (PORTAL_PREFIX[currentUser.role] && !portalMayUse(currentUser.role, req)) {
      return next(new AppError('Not authorized to access this route', 403));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};
