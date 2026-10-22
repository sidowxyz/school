import express from 'express';
import {
  createBook, getBooks, getBookById, updateBook, deleteBook,
  issueBook, returnBook, getAllIssues,
  getStudentHistory, getStaffHistory,
  getStudentFines, updateFineStatus
} from '../controllers/libraryController.js';
import { validate } from '../middleware/validate.js';
import {
  createBookSchema, updateBookSchema,
  issueBookSchema, returnBookSchema,
  updateFineStatusSchema
} from '../validators/libraryValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Desk actions (adding/editing the catalog, issuing/returning, fine status) are
// librarian/admin only; browsing the catalog and viewing history/fines stays
// open to any authenticated user.
const canManageLibrary = authorize('admin', 'librarian');

// BOOKS
// GET  /api/library/books?search=&title=&author=&isbn=&category=&page=&limit=
router.get('/books', authenticate, getBooks);
// POST /api/library/books — accepts the flat catalog shape
// ({ title, author, category, rack, isbn, totalCopies }); the service
// find-or-creates the author/category/shelf records.
router.post('/books', authenticate, canManageLibrary, createBook);
// GET  /api/library/books/:id
router.get('/books/:id', authenticate, getBookById);
// PUT  /api/library/books/:id
router.put('/books/:id', authenticate, canManageLibrary, updateBook);
// DELETE /api/library/books/:id
router.delete('/books/:id', authenticate, canManageLibrary, deleteBook);

// ISSUE & RETURN
// GET /api/library/issues — all student borrow records (flat shape)
router.get('/issues', authenticate, getAllIssues);
// POST /api/library/issues
router.post('/issues', authenticate, canManageLibrary, validate(issueBookSchema), issueBook);
// POST /api/library/returns
router.post('/returns', authenticate, canManageLibrary, validate(returnBookSchema), returnBook);

// BORROWING HISTORY
// GET /api/library/history/student/:studentId?status=&page=&limit=
router.get('/history/student/:studentId', authenticate, getStudentHistory);
// GET /api/library/history/staff/:staffId?status=&page=&limit=
router.get('/history/staff/:staffId', authenticate, getStaffHistory);

// FINES
// GET  /api/library/fines/student/:studentId?status=unpaid|paid|waived
router.get('/fines/student/:studentId', authenticate, getStudentFines);
// PUT  /api/library/fines/:fineId/status
router.put('/fines/:fineId/status', authenticate, canManageLibrary, validate(updateFineStatusSchema), updateFineStatus);

export default router;
