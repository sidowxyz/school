// Roles page: built-in roles (read-only) and custom roles an admin creates,
// each with the pages and actions it may use. Admin-only (see roleRoutes).
import AccessRole from '../models/AccessRole.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ACTIONS, BUILT_IN_ROLES, MODULES, SYSTEM_ROLES } from '../config/access.js';
import { clearRoleCache } from '../services/accessRoleService.js';

const userCounts = async () => {
  const rows = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
};

// Keep only real pages and actions, in a fixed order; "view" is implied by any
// other action, because you can't add or edit on a page you can't open.
const cleanPermissions = (input = {}) => MODULES
  .map(({ key }) => {
    const asked = Array.isArray(input[key]) ? input[key] : [];
    const actions = ACTIONS.filter((a) => asked.includes(a));
    if (actions.length && !actions.includes('view')) actions.unshift('view');
    return { module: key, actions };
  })
  .filter((p) => p.actions.length);

// "Front Desk" -> "front_desk"; never collides with a built-in role key.
const keyFromName = async (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'r_$1').slice(0, 30) || 'role';
  let key = base.length < 2 ? `${base}_role` : base;
  for (let n = 2; SYSTEM_ROLES.includes(key) || await AccessRole.exists({ key }); n += 1) key = `${base}_${n}`;
  return key;
};

const toJson = (role, counts) => ({
  _id: role._id,
  key: role.key,
  name: role.name,
  description: role.description,
  color: role.color,
  builtIn: false,
  permissions: role.permissionMap(),
  userCount: counts[role.key] ?? 0,
  updatedAt: role.updatedAt,
});

// GET /api/roles
export const listRoles = async (req, res, next) => {
  try {
    const [counts, custom] = await Promise.all([userCounts(), AccessRole.find().sort({ name: 1 })]);
    const builtIn = BUILT_IN_ROLES.map((r) => ({
      key: r.key, name: r.name, description: r.description, color: r.color, builtIn: true,
      allAccess: !!r.allAccess, portal: !!r.portal, permissions: r.permissions ?? {}, userCount: counts[r.key] ?? 0,
    }));
    res.status(200).json(new ApiResponse(200, {
      modules: MODULES.map(({ key, label, group }) => ({ key, label, group })),
      actions: ACTIONS,
      roles: [...builtIn, ...custom.map((r) => toJson(r, counts))],
    }, 'Roles retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const readBody = (body) => {
  const name = String(body.name ?? '').trim();
  if (name.length < 2 || name.length > 50) throw new AppError('Give the role a name of 2 to 50 characters.', 400);
  if (BUILT_IN_ROLES.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    throw new AppError(`"${name}" is a built-in role. Choose another name.`, 400);
  }
  const permissions = cleanPermissions(body.permissions);
  if (!permissions.length) throw new AppError('Give the role access to at least one page.', 400);
  return {
    name,
    description: String(body.description ?? '').trim().slice(0, 200),
    color: ['pink', 'yellow', 'blue', 'violet', 'green'].includes(body.color) ? body.color : 'blue',
    permissions,
  };
};

const duplicateName = (error) => error?.code === 11000;

// Names are unique regardless of case ("Front desk" = "front desk").
const nameTaken = (name, exceptId) => AccessRole.exists({ name, ...(exceptId && { _id: { $ne: exceptId } }) })
  .collation({ locale: 'en', strength: 2 });
const TAKEN = 'A role with this name already exists.';

// POST /api/roles
export const createRole = async (req, res, next) => {
  try {
    const data = readBody(req.body);
    if (await nameTaken(data.name)) return next(new AppError(TAKEN, 409));
    const role = await AccessRole.create({ ...data, key: await keyFromName(data.name), createBy: req.user._id });
    clearRoleCache(role.key);
    res.status(201).json(new ApiResponse(201, toJson(role, {}), 'Role created'));
  } catch (error) {
    if (duplicateName(error)) return next(new AppError(TAKEN, 409));
    next(error);
  }
};

// PUT /api/roles/:id
export const updateRole = async (req, res, next) => {
  try {
    const role = await AccessRole.findById(req.params.id);
    if (!role) return next(new AppError('Role not found', 404));
    const data = readBody(req.body);
    if (await nameTaken(data.name, role._id)) return next(new AppError(TAKEN, 409));
    Object.assign(role, data, { updateBy: req.user._id });
    await role.save();
    clearRoleCache(role.key);
    const counts = await userCounts();
    res.status(200).json(new ApiResponse(200, toJson(role, counts), 'Role saved'));
  } catch (error) {
    if (duplicateName(error)) return next(new AppError(TAKEN, 409));
    next(error);
  }
};

// DELETE /api/roles/:id — only when nobody has the role any more.
export const deleteRole = async (req, res, next) => {
  try {
    const role = await AccessRole.findById(req.params.id);
    if (!role) return next(new AppError('Role not found', 404));
    const inUse = await User.countDocuments({ role: role.key });
    if (inUse > 0) {
      return next(new AppError(`${inUse} user${inUse === 1 ? ' has' : 's have'} this role. Give them another role first.`, 409));
    }
    await role.deleteOne();
    clearRoleCache(role.key);
    res.status(200).json(new ApiResponse(200, null, 'Role deleted'));
  } catch (error) {
    next(error);
  }
};
