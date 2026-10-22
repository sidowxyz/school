import express from 'express';
// 1. Soo jiido labada middleware (Hubi in folder-ku yahay 'middleware' aniga oo eegaya sawirkaaga)
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { createYear, getYears, createTerm } from '../controllers/academicController.js';

const router = express.Router();

// =======================================================
// JIDADKA ACADEMIC YEARS (Sannadaha Waxbarashada)
// =======================================================

// Kaliya ADMIN ayaa abuuri kara Sannad Waxbarasho cusub
router.post('/years', authenticate, authorize('admin'), createYear);

// Qof kasta (Admin, Macallin, Arday) waa uu arki karaa sannadaha jira
router.get('/years', authenticate, authorize('admin', 'teacher', 'student'), getYears);


// =======================================================
//  JIDADKA TERMS (Marxaladaha/Xilliyada Waxbarashada)
// =======================================================

// Kaliya ADMIN ayaa abuuri kara Term cusub
router.post('/terms', authenticate, authorize('admin'), createTerm);

// Halkan ku dar kuwa kale ee dhiman...

export default router;