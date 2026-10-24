import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  listExams, createExam, updateExam, deleteExam, setPublished,
  markingOptions, getMarksheet, saveMarks, getClassResults, getReportCard,
} from '../controllers/examController.js';

const router = express.Router();
router.use(authenticate);

// Who does what: the academic office sets exams up and publishes them;
// teachers enter marks for their own lessons; the principal reads results.
const manage = authorize('admin', 'academic_officer');
const mark = authorize('admin', 'academic_officer', 'teacher');
const read = authorize('admin', 'principal', 'academic_officer', 'teacher');

router.get('/results', read, getClassResults);
router.get('/report-card/:studentId', read, getReportCard);

router.route('/')
  .get(read, listExams)
  .post(manage, createExam);
router.route('/:id')
  .put(manage, updateExam)
  .delete(manage, deleteExam);
router.patch('/:id/publish', manage, setPublished);
router.get('/:id/options', read, markingOptions);
router.get('/:id/marksheet', read, getMarksheet);
router.put('/:id/marks', mark, saveMarks);

export default router;
