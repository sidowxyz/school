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
router.get('/', getParents);
router.get('/:id', getParent);
router.put('/:id', canManageParents, updateParent);
router.post('/:id/students/:studentId', canManageParents, assignStudent);
router.delete('/:id/students/:studentId', canManageParents, unassignStudent);

export default router;
