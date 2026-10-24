import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

import {
  createFeeType,
  getFeeTypes,
  getFeeTypeById,
  updateFeeType,
  deleteFeeType
} from '../controllers/feeTypeController.js';

import {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure
} from '../controllers/feeStructureController.js';

import {
  createPaymentMethod,
  getPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod
} from '../controllers/paymentMethodController.js';

import {
  createStudentInvoice,
  createBulkStudentInvoices,
  getStudentInvoices,
  getStudentInvoiceById,
  updateStudentInvoice,
  deleteStudentInvoice
} from '../controllers/studentInvoiceController.js';

import {
  createStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFee,
  deleteStudentFee,
  downloadStudentFeeReceipt
} from '../controllers/studentFeeController.js';

import {
  createFeeTypeSchema,
  updateFeeTypeSchema,
  createFeeStructureSchema,
  updateFeeStructureSchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  createStudentInvoiceSchema,
  updateStudentInvoiceSchema,
  createBulkStudentInvoiceSchema,
  createStudentFeeSchema,
  updateStudentFeeSchema
} from '../validators/feeValidator.js';

const router = express.Router();

// ==========================================
// FEE TYPES ROUTES
// ==========================================
router.post('/fee-types', authenticate, authorize('admin'), validate(createFeeTypeSchema), createFeeType);
// Reads: finance staff, plus the offices that see a student's fees on the profile.
const canViewFinance = authorize('admin', 'accountant', 'principal', 'academic_officer');

router.get('/fee-types', authenticate, canViewFinance, getFeeTypes);
router.get('/fee-types/:id', authenticate, canViewFinance, getFeeTypeById);
router.put('/fee-types/:id', authenticate, authorize('admin'), validate(updateFeeTypeSchema), updateFeeType);
router.delete('/fee-types/:id', authenticate, authorize('admin'), deleteFeeType);

// ==========================================
// FEE STRUCTURES ROUTES
// ==========================================
router.post('/fee-structures', authenticate, authorize('admin'), validate(createFeeStructureSchema), createFeeStructure);
router.get('/fee-structures', authenticate, canViewFinance, getFeeStructures);
router.get('/fee-structures/:id', authenticate, canViewFinance, getFeeStructureById);
router.put('/fee-structures/:id', authenticate, authorize('admin'), validate(updateFeeStructureSchema), updateFeeStructure);
router.delete('/fee-structures/:id', authenticate, authorize('admin'), deleteFeeStructure);

// ==========================================
// PAYMENT METHODS ROUTES
// ==========================================
router.post('/payment-methods', authenticate, authorize('admin'), validate(createPaymentMethodSchema), createPaymentMethod);
router.get('/payment-methods', authenticate, getPaymentMethods);
router.get('/payment-methods/:id', authenticate, getPaymentMethodById);
router.put('/payment-methods/:id', authenticate, authorize('admin'), validate(updatePaymentMethodSchema), updatePaymentMethod);
router.delete('/payment-methods/:id', authenticate, authorize('admin'), deletePaymentMethod);

// ==========================================
// STUDENT INVOICES ROUTES
// ==========================================
router.post('/student-invoices', authenticate, authorize('admin'), validate(createStudentInvoiceSchema), createStudentInvoice);
router.post('/student-invoices/bulk', authenticate, authorize('admin'), validate(createBulkStudentInvoiceSchema), createBulkStudentInvoices);
router.get('/student-invoices', authenticate, canViewFinance, getStudentInvoices);
router.get('/student-invoices/:id', authenticate, canViewFinance, getStudentInvoiceById);
router.put('/student-invoices/:id', authenticate, authorize('admin'), validate(updateStudentInvoiceSchema), updateStudentInvoice);
router.delete('/student-invoices/:id', authenticate, authorize('admin'), deleteStudentInvoice);

// ==========================================
// STUDENT FEES ROUTES
// ==========================================
router.post('/student-fees', authenticate, authorize('admin'), validate(createStudentFeeSchema), createStudentFee);
router.get('/student-fees', authenticate, canViewFinance, getStudentFees);
router.get('/student-fees/:id', authenticate, canViewFinance, getStudentFeeById);
router.get('/student-fees/:id/receipt', authenticate, canViewFinance, downloadStudentFeeReceipt);
router.put('/student-fees/:id', authenticate, authorize('admin'), validate(updateStudentFeeSchema), updateStudentFee);
router.delete('/student-fees/:id', authenticate, authorize('admin'), deleteStudentFee);

export default router;
