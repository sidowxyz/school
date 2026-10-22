import express from 'express';
import {
  createAuthor, getAuthors, getAuthorById, updateAuthor, deleteAuthor
} from '../controllers/authorCategoryShelfController.js';
import {
  createCategory, getCategories, getCategoryById, updateCategory, deleteCategory
} from '../controllers/authorCategoryShelfController.js';
import {
  createShelf, getShelves, getShelfById, updateShelf, deleteShelf
} from '../controllers/authorCategoryShelfController.js';
import { validate } from '../middleware/validate.js';
import {
  createAuthorSchema, updateAuthorSchema,
  createCategorySchema, updateCategorySchema,
  createShelfSchema, updateShelfSchema
} from '../validators/libraryValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

const canManageLibrary = authorize('admin', 'librarian');

// AUTHORS
router.get('/authors',      authenticate, getAuthors);
router.post('/authors',     authenticate, canManageLibrary, validate(createAuthorSchema), createAuthor);
router.get('/authors/:id',  authenticate, getAuthorById);
router.put('/authors/:id',  authenticate, canManageLibrary, validate(updateAuthorSchema), updateAuthor);
router.delete('/authors/:id', authenticate, canManageLibrary, deleteAuthor);

// CATEGORIES
router.get('/categories',       authenticate, getCategories);
router.post('/categories',      authenticate, canManageLibrary, validate(createCategorySchema), createCategory);
router.get('/categories/:id',   authenticate, getCategoryById);
router.put('/categories/:id',   authenticate, canManageLibrary, validate(updateCategorySchema), updateCategory);
router.delete('/categories/:id', authenticate, canManageLibrary, deleteCategory);

// SHELVES
router.get('/shelves',       authenticate, getShelves);
router.post('/shelves',      authenticate, canManageLibrary, validate(createShelfSchema), createShelf);
router.get('/shelves/:id',   authenticate, getShelfById);
router.put('/shelves/:id',   authenticate, canManageLibrary, validate(updateShelfSchema), updateShelf);
router.delete('/shelves/:id', authenticate, canManageLibrary, deleteShelf);

export default router;
