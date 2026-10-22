import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  getPromotionLadder,
  getPromotionPreview,
  promoteClass,
  promoteSpecial,
  getPromotionHistory
} from '../controllers/promotionController.js';
import { promoteClassSchema, promoteSpecialSchema } from '../validators/promotionValidator.js';

const router = express.Router();

// Promotion is academic staff work.
const ACADEMIC_STAFF = ['admin', 'principal', 'academic_officer'];
// Special promotion moves a student outside the normal path, so it is held to
// the narrower set the school can hold accountable for the exception.
const SPECIAL_PROMOTION = ['admin', 'principal'];

// GET  /api/promotions/ladder   - Class hierarchy with each class's next class
router.get('/ladder', authenticate, getPromotionLadder);

// GET  /api/promotions/preview  - Promotion worksheet for one class
router.get('/preview', authenticate, authorize(...ACADEMIC_STAFF), getPromotionPreview);

// GET  /api/promotions/history  - Audit trail
router.get('/history', authenticate, authorize(...ACADEMIC_STAFF), getPromotionHistory);

// POST /api/promotions/class    - Normal (consecutive) promotion for a class
router.post(
  '/class',
  authenticate,
  authorize(...ACADEMIC_STAFF),
  validate(promoteClassSchema),
  auditLogger('Student', 'UPDATE'),
  promoteClass
);

// POST /api/promotions/special  - Exceptional promotion / class transfer
router.post(
  '/special',
  authenticate,
  authorize(...SPECIAL_PROMOTION),
  validate(promoteSpecialSchema),
  auditLogger('Student', 'UPDATE'),
  promoteSpecial
);

export default router;
