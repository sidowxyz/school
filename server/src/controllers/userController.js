// Admin user & role management — the administrative half of the auth API.
// Lets an admin list users, change a user's role, and activate/deactivate an
// account. Deactivation (status: false) is enforced by the authenticate
// middleware and the login handler, so it takes effect immediately.
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generatePassword } from '../utils/generatePassword.js';
import { roleExists } from '../services/accessRoleService.js';
import { pageParams, searchRegex } from '../utils/query.js';

const UNKNOWN_ROLE = 'That role does not exist. Pick a built-in role or one made on the Roles page.';

// Teachers, students and parents get their login from their own page, which
// also creates the profile the login needs. Here: office staff and custom roles.
const PROFILE_ROLES = ['teacher', 'student', 'parent'];
const PROFILE_ROLE_MESSAGE = 'Teacher, student and parent logins are created from the Teachers, Students and Parents pages.';

const checkAssignableRole = async (role) => {
  if (PROFILE_ROLES.includes(role)) return PROFILE_ROLE_MESSAGE;
  if (!(await roleExists(role))) return UNKNOWN_ROLE;
  return null;
};

// The school must always keep at least one active admin.
const isLastActiveAdmin = async (user) => user.role === 'admin' && user.status !== false
  && (await User.countDocuments({ role: 'admin', status: { $ne: false } })) <= 1;

const SAFE_FIELDS = '-password -passwordResetToken -passwordResetExpires';

// POST /api/users — direct account creation for roles that have no dedicated
// profile-creation flow of their own (principal, accountant,
// academic_officer, admin). Teacher/Student/Parent already create their User
// row as part of their own richer creation flows (createTeacher, etc.).
export const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, password } = req.body;
    const roleProblem = await checkAssignableRole(role);
    if (roleProblem) return next(new AppError(roleProblem, 400));

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
    const { role, status, search } = req.query;
    const { page, limit, skip } = pageParams(req.query, { defaultLimit: 20, maxLimit: 200 });
    const filter = {};
    if (typeof role === 'string' && role) filter.role = role;
    if (status !== undefined) filter.status = status === 'true';
    const regex = searchRegex(search);
    if (regex) filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];

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
    const roleProblem = await checkAssignableRole(role);
    if (roleProblem) return next(new AppError(roleProblem, 400));
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));
    if (PROFILE_ROLES.includes(user.role)) {
      return next(new AppError(`This is a ${user.role} login. Change it from the ${user.role === 'teacher' ? 'Teachers' : user.role === 'student' ? 'Students' : 'Parents'} page.`, 400));
    }
    if (role !== 'admin' && await isLastActiveAdmin(user)) {
      return next(new AppError('This is the only active admin. Make someone else an admin first.', 400));
    }

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
    if (status === false && await isLastActiveAdmin(user)) {
      return next(new AppError('This is the only active admin. Make someone else an admin first.', 400));
    }

    user.status = status;
    // A deactivated account is signed out everywhere.
    if (status === false) user.refreshTokens = [];
    await user.save();

    return res.status(200).json(new ApiResponse(200, {
      id: user._id, email: user.email, status: user.status
    }, `User ${status ? 'activated' : 'deactivated'} successfully`));
  } catch (error) {
    next(error);
  }
};

// POST /api/users/:id/reset-password — sets a new temporary password, shown to
// the admin once, and signs the user out everywhere. This is how a forgotten
// password is fixed (the app sends no email).
export const resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    const temporaryPassword = generatePassword();
    user.password = temporaryPassword;
    user.refreshTokens = [];
    await user.save();

    return res.status(200).json(new ApiResponse(200, { email: user.email, temporaryPassword }, 'Password reset'));
  } catch (error) {
    next(error);
  }
};
