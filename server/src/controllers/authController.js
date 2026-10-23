import User from '../models/User.js';
import Student from '../models/Student.js';
import Guardian from '../models/Guardian.js';
import Teacher from '../models/Teacher.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenService.js';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { accessFor } from '../services/accessRoleService.js';
import crypto from 'crypto';

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

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const userExists = await User.findOne({ email: validatedData.email });
    if (userExists) {
      return next(new AppError('Email is already in use', 400));
    }

    const user = await User.create({
      firstName: validatedData.firstName,
      lastName:  validatedData.lastName,
      email:     validatedData.email,
      password:  validatedData.password,
      role:      'student'
    });

    return res.status(201).json(
      new ApiResponse(201, { id: user._id, name: user.name, email: user.email }, 'User registered successfully')
    );
  } catch (error) {
    next(error);
  }
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
    const refreshToken = generateRefreshToken(user);

    // Hash refresh token before saving to DB
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshToken = hashedToken;
    await user.save();

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

    // Hash token to find user in DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ refreshToken: hashedToken });
    if (!user) return next(new AppError('Invalid or deleted refresh token', 403));

    // Issue new access token
    const newAccessToken = generateAccessToken(user);
    return res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed successfully')
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
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      await User.findOneAndUpdate({ refreshToken: hashedToken }, { refreshToken: '' });
    }
    return res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether email exists
      return res.status(200).json(
        new ApiResponse(200, null, 'If an account with that email exists, a password reset link has been generated.')
      );
    }

    const resetToken  = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    return res.status(200).json(
      new ApiResponse(200, { resetUrl }, 'Password reset link generated successfully.')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token }    = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Password reset token is invalid or has expired.', 400));
    }

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json(new ApiResponse(200, null, 'Password has been reset successfully.'));
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
      '-password -refreshToken -passwordResetToken -passwordResetExpires'
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
    const { currentPassword, newPassword } = req.body;
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

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};