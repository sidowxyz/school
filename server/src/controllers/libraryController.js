import ApiResponse from '../utils/ApiResponse.js';
import * as libraryService from '../services/libraryService.js';

// BOOKS

export const createBook = async (req, res, next) => {
  try {
    const book = await libraryService.createBookService(req.body);
    res.status(201).json(new ApiResponse(201, book, 'Book created successfully'));
  } catch (err) { next(err); }
};

export const getBooks = async (req, res, next) => {
  try {
    const result = await libraryService.getAllBooksService(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Books retrieved successfully'));
  } catch (err) { next(err); }
};

export const getBookById = async (req, res, next) => {
  try {
    const book = await libraryService.getBookByIdService(req.params.id);
    res.status(200).json(new ApiResponse(200, book, 'Book retrieved successfully'));
  } catch (err) { next(err); }
};

export const updateBook = async (req, res, next) => {
  try {
    const book = await libraryService.updateBookService(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, book, 'Book updated successfully'));
  } catch (err) { next(err); }
};

export const deleteBook = async (req, res, next) => {
  try {
    const result = await libraryService.deleteBookService(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Book deleted successfully'));
  } catch (err) { next(err); }
};

// ISSUE & RETURN

export const issueBook = async (req, res, next) => {
  try {
    const issue = await libraryService.issueBookService(req.body);
    res.status(201).json(new ApiResponse(201, issue, 'Book issued successfully'));
  } catch (err) { next(err); }
};

export const returnBook = async (req, res, next) => {
  try {
    const result = await libraryService.returnBookService(req.body);
    const message = result.fineAmount > 0
      ? `Book returned with a fine of $${result.fineAmount} for ${result.lateDays} overdue day(s)`
      : 'Book returned successfully — no fine';
    res.status(200).json(new ApiResponse(200, result, message));
  } catch (err) { next(err); }
};

// List all student borrow records (flat shape for the library desk tabs).
export const getAllIssues = async (req, res, next) => {
  try {
    const records = await libraryService.getAllIssuesService(req.query);
    res.status(200).json(new ApiResponse(200, records, 'Borrow records retrieved'));
  } catch (err) { next(err); }
};

// HISTORY

export const getStudentHistory = async (req, res, next) => {
  try {
    const result = await libraryService.getStudentBorrowingHistoryService(req.params.studentId, req.query);
    res.status(200).json(new ApiResponse(200, result, 'Student borrowing history retrieved'));
  } catch (err) { next(err); }
};

export const getStaffHistory = async (req, res, next) => {
  try {
    const result = await libraryService.getStaffBorrowingHistoryService(req.params.staffId, req.query);
    res.status(200).json(new ApiResponse(200, result, 'Staff borrowing history retrieved'));
  } catch (err) { next(err); }
};

// FINES

export const getStudentFines = async (req, res, next) => {
  try {
    const result = await libraryService.getStudentFinesService(req.params.studentId, req.query);
    res.status(200).json(new ApiResponse(200, result, 'Student fines retrieved'));
  } catch (err) { next(err); }
};

export const updateFineStatus = async (req, res, next) => {
  try {
    const fine = await libraryService.updateFineStatusService(req.params.fineId, req.body.status, req.body.updateBy);
    res.status(200).json(new ApiResponse(200, fine, 'Fine status updated'));
  } catch (err) { next(err); }
};
