// Admin user & role management — the administrative half of the auth API.
// Lets an admin list users, change a user's role, and activate/deactivate an
// account. Deactivation (status: false) is enforced by the authenticate
// middleware and the login handler, so it takes effect immediately.
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generatePassword } from '../utils/generatePassword.js';

const SAFE_FIELDS = '-password -refreshToken -passwordResetToken -passwordResetExpires';

// POST /api/users — direct account creation for roles that have no dedicated
// profile-creation flow of their own (principal, accountant, librarian,
// academic_officer, admin). Teacher/Student/Parent already create their User
// row as part of their own richer creation flows (createTeacher, etc.).
export const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already in use', 400));

    const temporaryPassword = password || generatePassword();

    const user = await User.create({ firstName, lastName, email, password: temporaryPassword, role, createBy: req.user._id });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json(new ApiResponse(201, { user: userResponse, temporaryPassword }, 'User created successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/users?role=&status=&search=&page=&limit=
export const listUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status !== undefined) filter.status = status === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
    ]);

    return res.status(200).json(new ApiResponse(200, {
      total,
      page: Number(page),
      limit: Number(limit),
      users
    }, 'Users retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(SAFE_FIELDS);
    if (!user) return next(new AppError('User not found', 404));
    return res.status(200).json(new ApiResponse(200, user, 'User retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/role   body: { role }
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    user.role = role;
    await user.save();

    return res.status(200).json(new ApiResponse(200, {
      id: user._id, email: user.email, role: user.role
    }, 'User role updated successfully'));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/status   body: { status }
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    // An admin must not lock themselves out of their own account.
    if (req.params.id === req.user.id.toString() && status === false) {
      return next(new AppError('You cannot deactivate your own account.', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    user.status = status;
    await user.save();

    return res.status(200).json(new ApiResponse(200, {
      id: user._id, email: user.email, status: user.status
    }, `User ${status ? 'activated' : 'deactivated'} successfully`));
  } catch (error) {
    next(error);
  }
};
