import express from 'express';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
  bulkImportStudents,
  uploadPhoto,
  getPhoto,
  getReferenceData,
  promoteStudent,
  createStudentAccount
} from '../controllers/studentController.js';
import {
  uploadStudentDocument,
  getStudentDocuments,
  verifyStudentDocument,
  deleteStudentDocument
} from '../controllers/studentDocumentController.js';
import { validate } from '../middleware/validate.js';
import { authorize } from '../middleware/authorize.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  createStudentSchema,
  updateStudentSchema,
  updateStatusSchema
} from '../validators/studentValidator.js';
import {
  uploadPhotoMiddleware,
  uploadCSVMiddleware,
  uploadStudentDocumentMiddleware
} from '../middleware/upload.js';
import { authenticate } from '../middleware/authenticate.js';

const staffOnly = authorize('admin', 'principal', 'academic_officer');

const router = express.Router();

// GET    /api/students                  - List students (search, filter, pagination)
router.get('/',                 authenticate, getStudents);

// POST   /api/students                  - Create student
router.post('/',                authenticate, auditLogger('Student', 'CREATE'), validate(createStudentSchema), createStudent);

// POST   /api/students/bulk-import      - Bulk import from CSV
router.post('/bulk-import',     authenticate, auditLogger('Student', 'CREATE'), uploadCSVMiddleware, bulkImportStudents);

// GET    /api/students/references/all   - Reference data for dropdowns
router.get('/references/all',   authenticate, getReferenceData);

// GET    /api/students/photo/:fileId    - Stream photo from GridFS (must be before /:id)
router.get('/photo/:fileId',    getPhoto);

// GET    /api/students/:id              - Single student full profile
router.get('/:id',              authenticate, getStudentById);

// PUT    /api/students/:id              - Update student profile
router.put('/:id',              authenticate, auditLogger('Student', 'UPDATE'), validate(updateStudentSchema), updateStudent);

// DELETE /api/students/:id              - Soft delete student
router.delete('/:id',           authenticate, auditLogger('Student', 'DELETE'), deleteStudent);

// POST   /api/students/:id/status       - Update enrollment status
router.post('/:id/status',      authenticate, auditLogger('Student', 'UPDATE'), validate(updateStatusSchema), updateStudentStatus);

// POST   /api/students/:id/photo        - Upload profile photo
router.post('/:id/photo',       authenticate, auditLogger('Student', 'UPDATE'), uploadPhotoMiddleware, uploadPhoto);

// POST   /api/students/:id/promote      - Promote student to a new class
router.post('/:id/promote',     authenticate, authorize('admin'), promoteStudent);

// POST   /api/students/:id/account      - Provision login account for a student
router.post('/:id/account',     authenticate, authorize('admin'), createStudentAccount);

// POST   /api/students/:id/documents               - Upload a document
router.post('/:id/documents',                authenticate, staffOnly, uploadStudentDocumentMiddleware, uploadStudentDocument);

// GET    /api/students/:id/documents               - List a student's documents
router.get('/:id/documents',                 authenticate, staffOnly, getStudentDocuments);

// PATCH  /api/students/:id/documents/:docId/verify  - Mark a document as Verified
router.patch('/:id/documents/:docId/verify', authenticate, staffOnly, verifyStudentDocument);

// DELETE /api/students/:id/documents/:docId         - Delete a document
router.delete('/:id/documents/:docId',       authenticate, staffOnly, deleteStudentDocument);

export default router;