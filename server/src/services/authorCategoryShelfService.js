import mongoose from 'mongoose';
import Author from '../models/Author.js';
import BookCategory from '../models/BookCategory.js';
import Shelf from '../models/Shelf.js';
import AppError from '../utils/AppError.js';

// AUTHORS

export const createAuthorService = async (data) => {
  return await Author.create(data);
};

export const getAllAuthorsService = async (query = {}) => {
  const { search, page = 1, limit = 50 } = query;
  const filter = {};
  if (search) filter.$text = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [total, authors] = await Promise.all([
    Author.countDocuments(filter),
    Author.find(filter).sort({ author_name: 1 }).skip(skip).limit(parseInt(limit))
  ]);

  return { pagination: { total, page: parseInt(page), limit: parseInt(limit) }, authors };
};

export const getAuthorByIdService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid author ID', 400);
  const author = await Author.findById(id);
  if (!author) throw new AppError('Author not found', 404);
  return author;
};

export const updateAuthorService = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid author ID', 400);
  const author = await Author.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!author) throw new AppError('Author not found', 404);
  return author;
};

export const deleteAuthorService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid author ID', 400);
  const author = await Author.findByIdAndDelete(id);
  if (!author) throw new AppError('Author not found', 404);
  return { message: 'Author deleted successfully' };
};

// CATEGORIES

export const createCategoryService = async (data) => {
  return await BookCategory.create(data);
};

export const getAllCategoriesService = async (query = {}) => {
  const { page = 1, limit = 50 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [total, categories] = await Promise.all([
    BookCategory.countDocuments(),
    BookCategory.find().sort({ cat_name: 1 }).skip(skip).limit(parseInt(limit))
  ]);
  return { pagination: { total, page: parseInt(page), limit: parseInt(limit) }, categories };
};

export const getCategoryByIdService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid category ID', 400);
  const category = await BookCategory.findById(id);
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

export const updateCategoryService = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid category ID', 400);
  const category = await BookCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

export const deleteCategoryService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid category ID', 400);
  const category = await BookCategory.findByIdAndDelete(id);
  if (!category) throw new AppError('Category not found', 404);
  return { message: 'Category deleted successfully' };
};

// SHELVES

export const createShelfService = async (data) => {
  return await Shelf.create(data);
};

export const getAllShelvesService = async (query = {}) => {
  const { page = 1, limit = 50 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [total, shelves] = await Promise.all([
    Shelf.countDocuments(),
    Shelf.find().sort({ sh_name: 1 }).skip(skip).limit(parseInt(limit))
  ]);
  return { pagination: { total, page: parseInt(page), limit: parseInt(limit) }, shelves };
};

export const getShelfByIdService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid shelf ID', 400);
  const shelf = await Shelf.findById(id);
  if (!shelf) throw new AppError('Shelf not found', 404);
  return shelf;
};

export const updateShelfService = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid shelf ID', 400);
  const shelf = await Shelf.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!shelf) throw new AppError('Shelf not found', 404);
  return shelf;
};

export const deleteShelfService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid shelf ID', 400);
  const shelf = await Shelf.findByIdAndDelete(id);
  if (!shelf) throw new AppError('Shelf not found', 404);
  return { message: 'Shelf deleted successfully' };
};
