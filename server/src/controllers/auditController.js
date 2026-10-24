import AuditLog from '../models/auditLog.model.js';
import AuditAction from '../models/auditAction.model.js';
import AuditModule from '../models/auditModule.model.js';
import { escapeRegex } from '../utils/query.js';

/**
 * Get populated and paginated audit logs with search filters.
 * Access restricted to Admin only.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, userId, recordId, ip, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = {};

    // 1. Module name filter
    if (module) {
      const moduleDoc = await AuditModule.findOne({ module_name: new RegExp(`^${escapeRegex(module)}$`, 'i') });
      if (moduleDoc) {
        filter.module_no = moduleDoc._id;
      } else {
        return res.status(200).json({
          success: true,
          pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
          data: []
        });
      }
    }

    // 2. Action name filter
    if (action) {
      const actionDoc = await AuditAction.findOne({ action_name: new RegExp(`^${escapeRegex(action)}$`, 'i') });
      if (actionDoc) {
        filter.action_no = actionDoc._id;
      } else {
        return res.status(200).json({
          success: true,
          pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
          data: []
        });
      }
    }

    // 3. User ID filter
    if (userId) {
      filter.user_id = userId;
    }

    // 4. Record ID filter
    if (recordId) {
      filter.record_id = recordId;
    }

    // 5. IP address filter
    if (ip) {
      filter.ip_address = ip;
    }

    // 6. Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // 7. Pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // 8. Execute query with population
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user_id', 'firstName lastName email role')
      .populate('action_no', 'action_name')
      .populate('module_no', 'module_name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Map populated records for a cleaner API response
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      audit_no: log.audit_no,
      user: log.user_id ? {
        id: log.user_id._id,
        name: `${log.user_id.firstName} ${log.user_id.lastName}`,
        email: log.user_id.email,
        role: log.user_id.role
      } : null,
      action: log.action_no?.action_name || 'UNKNOWN',
      module: log.module_no?.module_name || 'UNKNOWN',
      record_id: log.record_id,
      before_changes: log.before_changes,
      after_changes: log.after_changes,
      ip_address: log.ip_address,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      data: formattedLogs
    });

  } catch (error) {
    next(error);
  }
};
