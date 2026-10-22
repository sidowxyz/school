import mongoose from 'mongoose';
import { logAudit } from '../utils/auditHelper.js';

/**
 * Middleware to intercept the response, record before/after states, and log audit entries.
 */
export const auditLogger = (moduleName, actionName) => {
  return async (req, res, next) => {
    const normalizedAction = actionName.toUpperCase();
    let before = null;

    // 1. Fetch "before" state for update/delete operations before the controller updates it
    if ((normalizedAction === 'UPDATE' || normalizedAction === 'DELETE') && req.params.id) {
      try {
        const Model = mongoose.model(moduleName);
        if (Model) {
          before = await Model.findById(req.params.id).lean();
        }
      } catch (err) {
        console.warn(`Could not fetch 'before' state for module ${moduleName}:`, err.message);
      }
    }

    // 2. Intercept response JSON to capture the result payload
    const originalJson = res.json;
    let resultData = null;
    res.json = function (data) {
      resultData = data;
      return originalJson.apply(this, arguments);
    };

    // 3. Listen to the finish event to log after the response has been sent
    res.on('finish', async () => {
      // Only audit successful operations (status codes 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.id || req.user?._id || null;
          const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
          const payload = resultData?.data || resultData?.payment || resultData?.teacher || resultData?.student || resultData?.invoice || resultData?.mark || resultData || null;
          const after = payload;
          const recordId = after?._id?.toString() || req.params.id || (typeof payload === 'string' ? payload : 'N/A');

          await logAudit({
            userId,
            action: normalizedAction,
            module: moduleName,
            recordId,
            before,
            after,
            ip,
          });
        } catch (logErr) {
          console.error('Audit logger error during finish event:', logErr);
        }
      }
    });

    next();
  };
};
