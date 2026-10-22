import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  createFamily,
  addGuardian,
  assignStudentToFamily,
  linkGuardianToStudent,
  getFamilyProfile,
  updateFamily,
} from '../controllers/familyController.js';

const router = express.Router();

// Family records hold guardian contact details — every route requires a login.
router.use(authenticate);

const canManageFamilies = authorize('admin', 'principal', 'academic_officer');

router.post('/', canManageFamilies, createFamily);
router.post('/:familyId/guardians', canManageFamilies, addGuardian);
router.post('/:familyId/students/:studentId', canManageFamilies, assignStudentToFamily);
router.put('/students/:studentId/guardians/:guardianId', canManageFamilies, linkGuardianToStudent);
router.get('/:familyId', getFamilyProfile);
router.put('/:familyId', canManageFamilies, updateFamily);

export default router;
