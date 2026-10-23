import AccessRole from '../models/AccessRole.js';
import { SYSTEM_ROLES } from '../config/access.js';

// Custom roles are read on every request a custom-role user makes, so keep
// them in memory for a short while. Saving or deleting a role clears the cache
// straight away, so changes on the Roles page apply on the next request.
const TTL_MS = 30_000;
const cache = new Map();

export const isSystemRole = (key) => SYSTEM_ROLES.includes(key);

/** The permission map for a custom role key, or null if no such role exists. */
export const getCustomPermissions = async (key) => {
  if (!key || isSystemRole(key)) return null;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const role = await AccessRole.findOne({ key });
  const value = role ? { name: role.name, permissions: role.permissionMap() } : null;
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
};

export const clearRoleCache = (key) => {
  if (key) cache.delete(key);
  else cache.clear();
};

/**
 * Extra fields sent to the client at login and from /auth/me: for a custom
 * role, its name and the pages it may open. Built-in roles need nothing extra.
 */
export const accessFor = async (role) => {
  const custom = await getCustomPermissions(role);
  return custom ? { roleName: custom.name, permissions: custom.permissions } : {};
};

/** True for a built-in role or a custom role that exists. */
export const roleExists = async (key) => isSystemRole(key) || !!(await getCustomPermissions(key));
