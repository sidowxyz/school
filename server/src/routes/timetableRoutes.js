import express from 'express';
import { addTimetableSlot } from '../controllers/timetableController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Route-ka rasmiga ah ee abuurista xiisadaha
router.post('/slots', authenticate, authorize('admin', 'principal', 'academic_officer'), addTimetableSlot);

export default router;