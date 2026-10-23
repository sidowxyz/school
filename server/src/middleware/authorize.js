import AppError from '../utils/AppError.js';
import { actionForMethod, isLookupPath, moduleForPath } from '../config/access.js';
import { getCustomPermissions, isSystemRole } from '../services/accessRoleService.js';

// Built-in roles pass when they are in the route's list. A custom role (made on
// the Roles page) passes when it has been given the page this route belongs to,
// with the matching action: GET = view, POST = create, PUT/PATCH = edit,
// DELETE = delete. Lists used for filters (classes, terms, ...) can be read by
// any custom role that can open at least one page.
export const authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return next(new AppError('Not authorized to access this route', 403));
    if (roles.includes(role)) return next();
    if (isSystemRole(role)) return next(new AppError('Not authorized to access this route', 403));

    getCustomPermissions(role)
      .then((custom) => {
        const permissions = custom?.permissions ?? {};
        const url = req.originalUrl;
        const action = actionForMethod(req.method);
        const module = moduleForPath(url);
        if (module && permissions[module]?.includes(action)) return next();
        if (action === 'view' && isLookupPath(url) && Object.keys(permissions).length > 0) return next();
        next(new AppError("Your role doesn't allow this action", 403));
      })
      .catch(next);
  };
};
