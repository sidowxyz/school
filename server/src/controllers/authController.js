import User from '../models/User.js';
import Student from '../models/Student.js';
import Guardian from '../models/Guardian.js';
import Teacher from '../models/Teacher.js';
import { loginSchema } from '../validators/authValidator.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenService.js';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { accessFor } from '../services/accessRoleService.js';
import crypto from 'crypto';

// Refresh tokens are stored hashed, one per signed-in device (newest MAX_SESSIONS),
// so a phone and a laptop can stay signed in together. Each refresh swaps the
// used token for a new one; a password change ends every other session.
const MAX_SESSIONS = 5;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const startSession = async (user) => {
  const refreshToken = generateRefreshToken(user);
  await User.updateOne({ _id: user._id }, {
    $push: { refreshTokens: { $each: [hashToken(refreshToken)], $slice: -MAX_SESSIONS } },
    $set: { lastLogin: new Date() },
  });
  return refreshToken;
};

const resolveProfile = async (user) => {
  if (user.role === 'student') {
    const student = await Student.findOne({ userId: user._id })
      .select('firstName lastName admissionNumber classId sectionId');
    if (student) {
      const studentObj = student.toJSON();
      studentObj.admission_no = student.admissionNumber;
      studentObj.class = student.classId;
      studentObj.section = student.sectionId;
      return { type: 'student', data: studentObj };
    }
  }
  if (user.role === 'parent') {
    const guardian = await Guardian.findOne({ userId: user._id }).select('name relationship phone familyId');
    if (guardian) return { type: 'guardian', data: guardian };
  }
  const teacher = await Teacher.findOne({ userId: user._id }).select('staffId department status');
  if (teacher) return { type: 'teacher', data: teacher };
  return { type: null, data: null };
};

// @desc    Login user & get tokens
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user || !(await user.matchPassword(validatedData.password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Deactivated accounts cannot obtain new tokens.
    if (user.status === false) {
      return next(new AppError('This account has been deactivated. Contact an administrator.', 403));
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = await startSession(user);

    return res.status(200).json(new ApiResponse(200, {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.name,
        email: user.email,
        role: user.role,
        ...(await accessFor(user.role))
      },
      accessToken,
      token: accessToken,
      refreshToken
    }, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError('Refresh token is required', 401));

    // Verify token signature first
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Swap the used token for a new one in a single update, so the same token
    // can't be used twice. Deactivated accounts can't refresh.
    const nextToken = generateRefreshToken({ _id: jwt.decode(token).id });
    const user = await User.findOneAndUpdate(
      { refreshTokens: hashToken(token), status: { $ne: false } },
      { $set: { 'refreshTokens.$': hashToken(nextToken) } },
      { new: true },
    );
    if (!user) return next(new AppError('Invalid or deleted refresh token', 403));

    return res.status(200).json(
      new ApiResponse(200, { accessToken: generateAccessToken(user), refreshToken: nextToken }, 'Token refreshed successfully')
    );
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new AppError('Token has expired or is invalid', 403));
    }
    next(error);
  }
};

// @desc    Logout user & clear refresh token
// @route   POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token) {
      await User.updateOne({ refreshTokens: hashToken(token) }, { $pull: { refreshTokens: hashToken(token) } });
    }
    return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      '-password -passwordResetToken -passwordResetExpires'
    );

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const profile = await resolveProfile(user);

    return res.status(200).json(
      new ApiResponse(200, { user, profile, ...(await accessFor(user.role)) }, 'Current user retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    // refreshToken (optional): this device's session, which stays signed in.
    const { currentPassword, newPassword, refreshToken: keep } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    user.password = newPassword;
    await user.save();
    // Sign out every other device.
    const current = await User.findById(user._id).select('+refreshTokens');
    const kept = keep && current.refreshTokens.includes(hashToken(keep)) ? [hashToken(keep)] : [];
    await User.updateOne({ _id: user._id }, { refreshTokens: kept });

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};