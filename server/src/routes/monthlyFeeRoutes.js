import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  getClassFees, setClassFee, chargeMonth, listStudentBalances, searchStudents, getAccount, setStudentDiscount,
  collectPayment, listReceipts, getReceipt, getClassStatus, getReport,
} from '../controllers/monthlyFeeController.js';
import {
  setClassFeeSchema, chargeMonthSchema, studentDiscountSchema, collectPaymentSchema,
} from '../validators/monthlyFeeValidator.js';

const router = express.Router();

// Collecting fees is front-office work for admins and accountants; the
// principal can see where things stand but not take money.
const canCollect = authorize('admin', 'accountant');
const canView = authorize('admin', 'accountant', 'principal');

router.use(authenticate);

// GET  /api/fees/class-fees              - every class with its monthly fee
router.get('/class-fees', canView, getClassFees);
// PUT  /api/fees/class-fees/:classId     - set a class's monthly fee
router.put('/class-fees/:classId', authorize('admin'), validate(setClassFeeSchema), auditLogger('ClassFee', 'UPDATE'), setClassFee);

// POST /api/fees/charge                  - charge a month (all classes or one); safe to repeat
router.post('/charge', canCollect, validate(chargeMonthSchema), chargeMonth);

// GET  /api/fees/students?class_id=&status=owing|paid&q=&page=  - students with what they owe
router.get('/students', canCollect, listStudentBalances);
// GET  /api/fees/students/search?q=      - find a student by name, admission no. or parent
router.get('/students/search', canCollect, searchStudents);
// GET  /api/fees/students/:id/account    - what the student and siblings owe
router.get('/students/:studentId/account', canCollect, getAccount);
// PUT  /api/fees/students/:id/discount   - standing discount on future monthly charges
router.put('/students/:studentId/discount', authorize('admin'), validate(studentDiscountSchema), auditLogger('Student', 'UPDATE'), setStudentDiscount);

// POST /api/fees/collect                 - take one payment for one or more siblings
router.post('/collect', canCollect, validate(collectPaymentSchema), auditLogger('Payment', 'CREATE'), collectPayment);
router.get('/receipts', canView, listReceipts);
router.get('/receipts/:id', canView, getReceipt);

// GET  /api/fees/classes/:classId/status?period=YYYY-MM  - who has paid this month
router.get('/classes/:classId/status', canView, getClassStatus);
// GET  /api/fees/report?from=&to=&level_id=&class_id=
router.get('/report', canView, getReport);

export default router;
