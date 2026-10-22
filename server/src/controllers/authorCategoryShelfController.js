import ApiResponse from '../utils/ApiResponse.js';
import * as acsService from '../services/authorCategoryShelfService.js';

// AUTHORS

export const createAuthor = async (req, res, next) => {
  try {
    const author = await acsService.createAuthorService(req.body);
    res.status(201).json(new ApiResponse(201, author, 'Author created successfully'));
  } catch (err) { next(err); }
};

export const getAuthors = async (req, res, next) => {
  try {
    const result = await acsService.getAllAuthorsService(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Authors retrieved successfully'));
  } catch (err) { next(err); }
};

export const getAuthorById = async (req, res, next) => {
  try {
    const author = await acsService.getAuthorByIdService(req.params.id);
    res.status(200).json(new ApiResponse(200, author, 'Author retrieved successfully'));
  } catch (err) { next(err); }
};

export const updateAuthor = async (req, res, next) => {
  try {
    const author = await acsService.updateAuthorService(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, author, 'Author updated successfully'));
  } catch (err) { next(err); }
};

export const deleteAuthor = async (req, res, next) => {
  try {
    const result = await acsService.deleteAuthorService(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Author deleted successfully'));
  } catch (err) { next(err); }
};

// CATEGORIES

export const createCategory = async (req, res, next) => {
  try {
    const cat = await acsService.createCategoryService(req.body);
    res.status(201).json(new ApiResponse(201, cat, 'Category created successfully'));
  } catch (err) { next(err); }
};

export const getCategories = async (req, res, next) => {
  try {
    const result = await acsService.getAllCategoriesService(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Categories retrieved successfully'));
  } catch (err) { next(err); }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const cat = await acsService.getCategoryByIdService(req.params.id);
    res.status(200).json(new ApiResponse(200, cat, 'Category retrieved successfully'));
  } catch (err) { next(err); }
};

export const updateCategory = async (req, res, next) => {
  try {
    const cat = await acsService.updateCategoryService(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, cat, 'Category updated successfully'));
  } catch (err) { next(err); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const result = await acsService.deleteCategoryService(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Category deleted successfully'));
  } catch (err) { next(err); }
};

// SHELVES

export const createShelf = async (req, res, next) => {
  try {
    const shelf = await acsService.createShelfService(req.body);
    res.status(201).json(new ApiResponse(201, shelf, 'Shelf created successfully'));
  } catch (err) { next(err); }
};

export const getShelves = async (req, res, next) => {
  try {
    const result = await acsService.getAllShelvesService(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Shelves retrieved successfully'));
  } catch (err) { next(err); }
};

export const getShelfById = async (req, res, next) => {
  try {
    const shelf = await acsService.getShelfByIdService(req.params.id);
    res.status(200).json(new ApiResponse(200, shelf, 'Shelf retrieved successfully'));
  } catch (err) { next(err); }
};

export const updateShelf = async (req, res, next) => {
  try {
    const shelf = await acsService.updateShelfService(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, shelf, 'Shelf updated successfully'));
  } catch (err) { next(err); }
};

export const deleteShelf = async (req, res, next) => {
  try {
    const result = await acsService.deleteShelfService(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Shelf deleted successfully'));
  } catch (err) { next(err); }
};
