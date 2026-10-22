import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Reject deactivated accounts even if they hold a still-valid token.
    if (currentUser.status === false) {
      return next(new AppError('This account has been deactivated.', 401));
    }

    req.user = currentUser;
    next();
  } catch { // <-- Halkan waxaa laga saaray (_error) gebi ahaanba si uu ESLint u qanco
    return next(new AppError('Not authorized, token failed or expired', 401));
  }
};