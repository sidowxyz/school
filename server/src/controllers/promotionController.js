import * as PromotionService from '../services/promotionService.js';

/** Service errors carry a status; anything else is a real 500. */
const handle = (err, res, next) => {
  if (err.status === 400 || err.status === 404 || err.status === 409) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  return next(err);
};

/**
 * GET /api/promotions/ladder
 * Every class with its computed next class, roster size and sections —
 * the promotion hierarchy the Setup screen is built from
 */
export const getPromotionLadder = async (req, res, next) => {
  try {
    const data = await PromotionService.getPromotionLadder();
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/promotions/preview?class_id=&exam_period_id=&pass_percentage=
 * The promotion worksheet for one class
 */
export const getPromotionPreview = async (req, res, next) => {
  try {
    const { class_id, exam_period_id, exam_id, pass_percentage } = req.query;
    if (!class_id) {
      return res.status(400).json({ success: false, message: 'class_id is required' });
    }
    const data = await PromotionService.getPromotionPreview({
      class_id,
      exam_period_id,
      exam_id,
      pass_percentage: pass_percentage ? Number(pass_percentage) : 50
    });
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * POST /api/promotions/class
 * Normal promotion for a whole class — the destination is the next class in
 * the hierarchy, never a caller-chosen one
 */
export const promoteClass = async (req, res, next) => {
  try {
    const data = await PromotionService.promoteClass(req.body, req.user);
    res.status(201).json({
      success: true,
      message:
        `Promoted ${data.promoted}, retained ${data.retained}` +
        (data.graduated ? `, graduated ${data.graduated}` : ''),
      data
    });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * POST /api/promotions/special
 * Move one student to a non-consecutive class, with a recorded reason
 */
export const promoteSpecial = async (req, res, next) => {
  try {
    const data = await PromotionService.promoteSpecial(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Special promotion recorded',
      data
    });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/promotions/history
 */
export const getPromotionHistory = async (req, res, next) => {
  try {
    const data = await PromotionService.getPromotionHistory(req.query);
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};
