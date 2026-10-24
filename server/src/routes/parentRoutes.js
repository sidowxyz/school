import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  createParent,
  getParents,
  getParent,
  updateParent,
  assignStudent,
  unassignStudent,
} from '../controllers/parentController.js';

const router = express.Router();

router.use(authenticate);

const canManageParents = authorize('admin', 'principal', 'academic_officer');

router.post('/', canManageParents, createParent);
// Guardian contact details: only the offices that manage families.
router.get('/', canManageParents, getParents);
router.get('/:id', canManageParents, getParent);
router.put('/:id', canManageParents, updateParent);
router.post('/:id/students/:studentId', canManageParents, assignStudent);
router.delete('/:id/students/:studentId', canManageParents, unassignStudent);

export default router;
