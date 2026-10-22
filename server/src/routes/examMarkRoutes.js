import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  getSubmissionFor,
  listSubmissions,
  saveSubmission,
  approveSubmission,
  returnSubmission,
  publishSubmission,
  publishAllApproved
} from '../controllers/examResultController.js';
import {
  saveSubmissionSchema,
  returnSubmissionSchema,
  publishAllSchema
} from '../validators/examMarkValidator.js';

const router = express.Router();

// Teachers enter marks; academic staff review and publish them.
const MARK_ENTRY = ['teacher', 'admin', 'principal', 'academic_officer'];
const REVIEWERS = ['admin', 'principal', 'academic_officer'];

// GET  /api/exam-marks/for  - Marks sheet for one exam/class/subject
router.get('/for', authenticate, authorize(...MARK_ENTRY), getSubmissionFor);

// GET  /api/exam-marks      - List submissions (approvals queue, teacher's own work)
router.get('/', authenticate, authorize(...MARK_ENTRY), listSubmissions);

// PUT  /api/exam-marks      - Save marks as draft, or submit for approval
router.put('/', authenticate, authorize(...MARK_ENTRY), validate(saveSubmissionSchema), saveSubmission);

// POST /api/exam-marks/publish-all - Publish every approved submission.
// Declared before /:id/... so "publish-all" isn't read as a submission id.
router.post('/publish-all', authenticate, authorize(...REVIEWERS), validate(publishAllSchema), publishAllApproved);

// POST /api/exam-marks/:id/approve
router.post('/:id/approve', authenticate, authorize(...REVIEWERS), approveSubmission);

// POST /api/exam-marks/:id/return
router.post('/:id/return', authenticate, authorize(...REVIEWERS), validate(returnSubmissionSchema), returnSubmission);

// POST /api/exam-marks/:id/publish
router.post('/:id/publish', authenticate, authorize(...REVIEWERS), publishSubmission);

export default router;
