import express from 'express';
import {
  chat,
  quickActions,
  listConversations,
  getConversation,
  deleteConversation,
  confirmAction,
  cancelAction,
  reviewExamUpload,
  reviewAssignmentUpload,
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { uploadDocumentMiddleware } from '../middleware/uploadDocument.js';
import { chatSchema } from '../validators/aiValidator.js';

const router = express.Router();

// Every assistant route requires a valid token. There is no public surface here:
// individual tool permissions are enforced per-call inside the registry, but
// authentication is a precondition for reaching any of it.
router.use(authenticate);

router.post('/chat', aiLimiter, validate(chatSchema), chat);
router.get('/quick-actions', quickActions);

// Confirmation is a separate authenticated request against a server-stored
// pending action. This is the step the model cannot perform or fake: it is
// reached only by the user's own client calling this endpoint.
router.post('/actions/:id/confirm', aiLimiter, confirmAction);
router.delete('/actions/:id', cancelAction);

router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

// Multipart uploads bypass the chat/tool-registry JSON shape — a file doesn't
// fit a Zod args object — so role gating happens explicitly inside
// aiUploadService.js rather than via resolveTool. Reuses aiLimiter: these
// calls are no more expensive than a chat request that hits the model.
router.post('/exams/review-upload', aiLimiter, uploadDocumentMiddleware, reviewExamUpload);
router.post('/assignments/review-upload', aiLimiter, uploadDocumentMiddleware, reviewAssignmentUpload);

export default router;
