import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

import {
  createDiscountType,
  getDiscountTypes,
  getDiscountTypeById,
  updateDiscountType,
  deleteDiscountType
} from '../controllers/discountTypeController.js';

import {
  createAppliesTo,
  getAppliesTos,
  getAppliesToById,
  updateAppliesTo,
  deleteAppliesTo
} from '../controllers/appliesToController.js';

import {
  createScholarshipType,
  getScholarshipTypes,
  getScholarshipTypeById,
  updateScholarshipType,
  deleteScholarshipType
} from '../controllers/scholarshipTypeController.js';

import {
  createScholarship,
  getScholarships,
  getScholarshipById,
  updateScholarship,
  deleteScholarship
} from '../controllers/scholarshipController.js';

import {
  createSiblingRule,
  getSiblingRules,
  getSiblingRuleById,
  updateSiblingRule,
  deleteSiblingRule
} from '../controllers/siblingRuleController.js';

import {
  createStudentScholarship,
  getStudentScholarships,
  getStudentScholarshipById,
  updateStudentScholarship,
  deleteStudentScholarship,
  grantScholarship
} from '../controllers/studentScholarshipController.js';

import {
  createDiscountTypeSchema,
  updateDiscountTypeSchema,
  createAppliesToSchema,
  updateAppliesToSchema,
  createScholarshipTypeSchema,
  updateScholarshipTypeSchema,
  createScholarshipSchema,
  updateScholarshipSchema,
  createSiblingRuleSchema,
  updateSiblingRuleSchema,
  createStudentScholarshipSchema,
  updateStudentScholarshipSchema
} from '../validators/scholarshipValidator.js';

const router = express.Router();

// ==========================================
// DISCOUNT TYPES ROUTES
// ==========================================
router.post('/discount-types', authenticate, authorize('admin'), validate(createDiscountTypeSchema), createDiscountType);
router.get('/discount-types', authenticate, getDiscountTypes);
router.get('/discount-types/:id', authenticate, getDiscountTypeById);
router.put('/discount-types/:id', authenticate, authorize('admin'), validate(updateDiscountTypeSchema), updateDiscountType);
router.delete('/discount-types/:id', authenticate, authorize('admin'), deleteDiscountType);

// ==========================================
// APPLIES TO ROUTES
// ==========================================
router.post('/applies-to', authenticate, authorize('admin'), validate(createAppliesToSchema), createAppliesTo);
router.get('/applies-to', authenticate, getAppliesTos);
router.get('/applies-to/:id', authenticate, getAppliesToById);
router.put('/applies-to/:id', authenticate, authorize('admin'), validate(updateAppliesToSchema), updateAppliesTo);
router.delete('/applies-to/:id', authenticate, authorize('admin'), deleteAppliesTo);

// ==========================================
// SCHOLARSHIP TYPES ROUTES
// ==========================================
router.post('/scholarship-types', authenticate, authorize('admin'), validate(createScholarshipTypeSchema), createScholarshipType);
router.get('/scholarship-types', authenticate, getScholarshipTypes);
router.get('/scholarship-types/:id', authenticate, getScholarshipTypeById);
router.put('/scholarship-types/:id', authenticate, authorize('admin'), validate(updateScholarshipTypeSchema), updateScholarshipType);
router.delete('/scholarship-types/:id', authenticate, authorize('admin'), deleteScholarshipType);

// ==========================================
// SCHOLARSHIPS ROUTES
// ==========================================
router.post('/scholarships', authenticate, authorize('admin'), validate(createScholarshipSchema), createScholarship);
router.get('/scholarships', authenticate, getScholarships);
router.get('/scholarships/:id', authenticate, getScholarshipById);
router.put('/scholarships/:id', authenticate, authorize('admin'), validate(updateScholarshipSchema), updateScholarship);
router.delete('/scholarships/:id', authenticate, authorize('admin'), deleteScholarship);

// ==========================================
// SIBLING RULES ROUTES
// ==========================================
router.post('/sibling-rules', authenticate, authorize('admin'), validate(createSiblingRuleSchema), createSiblingRule);
router.get('/sibling-rules', authenticate, getSiblingRules);
router.get('/sibling-rules/:id', authenticate, getSiblingRuleById);
router.put('/sibling-rules/:id', authenticate, authorize('admin'), validate(updateSiblingRuleSchema), updateSiblingRule);
router.delete('/sibling-rules/:id', authenticate, authorize('admin'), deleteSiblingRule);

// ==========================================
// STUDENT SCHOLARSHIPS ROUTES
// ==========================================
// Must be registered BEFORE '/student-scholarships/:id' GET/PUT/DELETE below —
// not strictly necessary since this is POST-only and no other POST exists on
// this prefix, but kept first for readability.
router.post('/student-scholarships/grant', authenticate, authorize('admin', 'accountant'), grantScholarship);
router.post('/student-scholarships', authenticate, authorize('admin'), validate(createStudentScholarshipSchema), createStudentScholarship);
router.get('/student-scholarships', authenticate, getStudentScholarships);
router.get('/student-scholarships/:id', authenticate, getStudentScholarshipById);
router.put('/student-scholarships/:id', authenticate, authorize('admin'), validate(updateStudentScholarshipSchema), updateStudentScholarship);
router.delete('/student-scholarships/:id', authenticate, authorize('admin'), deleteStudentScholarship);

export default router;
