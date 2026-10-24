import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getPlan, getStudents, promote } from '../controllers/promotionController.js';

const router = express.Router();
router.use(authenticate);

// Part of setting up the school year, so it belongs to the academic office.
const office = authorize('admin', 'academic_officer');
router.get('/plan', office, getPlan);
router.get('/students', office, getStudents);
router.post('/', office, promote);

export default router;
