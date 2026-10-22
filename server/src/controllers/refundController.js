import * as refundService from '../services/refundService.js';

const handle = (err, res, next) => {
  if (err.status === 400 || err.status === 404) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  return next(err);
};

// POST /api/refunds
export const createRefund = async (req, res, next) => {
  try {
    const refund = await refundService.issueRefund(req.body, req.user._id);
    res.status(201).json({ success: true, message: 'Refund issued successfully', data: refund });
  } catch (error) {
    handle(error, res, next);
  }
};

// GET /api/refunds
export const getRefunds = async (req, res, next) => {
  try {
    const refunds = await refundService.listRefunds(req.query);
    res.status(200).json({ success: true, data: refunds });
  } catch (error) {
    handle(error, res, next);
  }
};

// GET /api/refunds/:id
export const getRefundById = async (req, res, next) => {
  try {
    const refund = await refundService.getRefundById(req.params.id);
    if (!refund) return res.status(404).json({ success: false, message: 'Refund not found' });
    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    handle(error, res, next);
  }
};

// POST /api/refunds/:id/reverse
export const reverseRefund = async (req, res, next) => {
  try {
    const refund = await refundService.reverseRefund(req.params.id, req.user?.username ?? req.user?._id?.toString());
    res.status(200).json({ success: true, message: 'Refund reversed', data: refund });
  } catch (error) {
    handle(error, res, next);
  }
};
