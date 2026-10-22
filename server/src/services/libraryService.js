import mongoose from 'mongoose';
import Book from '../models/Book.js';
import BookIssue from '../models/BookIssue.js';
import BookReturn from '../models/BookReturn.js';
import LibraryFine from '../models/LibraryFine.js';
import Author from '../models/Author.js';
import BookCategory from '../models/BookCategory.js';
import Shelf from '../models/Shelf.js';
import AppError from '../utils/AppError.js';

// Flat-shape adapters
// The frontend catalog uses a denormalised book model (author / category / rack
// as plain text). These helpers translate between that and the normalised store.

const findOrCreateByName = async (Model, field, value) => {
  const name = (value || '').trim();
  if (!name) return null;
  const existing = await Model.findOne({ [field]: name });
  if (existing) return existing._id;
  const created = await Model.create({ [field]: name });
  return created._id;
};

// Normalised Book document (author_id/cat_id/sh_id populated) → flat catalog shape.
const toFlatBook = (book) => {
  const created = book.createdAt || book.registerDate;
  return {
    id: book._id,
    title: book.book_name,
    author: book.author_id?.author_name ?? '',
    isbn: book.isbn ?? '',
    category: book.cat_id?.cat_name ?? '',
    totalCopies: book.qty,
    availableCopies: book.available_qty,
    rack: book.sh_id?.sh_name ?? '',
    addedDate: created ? new Date(created).toISOString().slice(0, 10) : '',
    archived: !!book.isDeleted,
  };
};

const populateBook = (q) =>
  q.populate('author_id', 'author_name').populate('cat_id', 'cat_name').populate('sh_id', 'sh_name');

// Map a flat catalog payload ({ title, author, category, rack, isbn, totalCopies })
// to Book fields, find-or-creating the author/category/shelf records by name.
const flatToBookFields = async (data) => {
  const fields = {};
  if (data.title !== undefined) fields.book_name = data.title;
  if (data.isbn !== undefined) fields.isbn = data.isbn || undefined;
  if (data.author !== undefined) fields.author_id = await findOrCreateByName(Author, 'author_name', data.author);
  if (data.category !== undefined) fields.cat_id = await findOrCreateByName(BookCategory, 'cat_name', data.category);
  if (data.rack !== undefined) fields.sh_id = await findOrCreateByName(Shelf, 'sh_name', data.rack);
  if (data.totalCopies !== undefined) fields.qty = Number(data.totalCopies) || 0;
  return fields;
};

// Fine rate per overdue day (USD). Override via env variable.
const FINE_RATE_PER_DAY = parseFloat(process.env.LIBRARY_FINE_RATE || '0.5');
// Default borrow period in days if expected_return_date is not provided
const DEFAULT_BORROW_DAYS = parseInt(process.env.LIBRARY_BORROW_DAYS || '14', 10);

// BOOK CRUD

export const createBookService = async (data) => {
  const fields = await flatToBookFields(data);
  const qty = fields.qty ?? 0;
  const book = await Book.create({ ...fields, qty, available_qty: qty });
  return toFlatBook(await populateBook(Book.findById(book._id)));
};

export const getAllBooksService = async (query = {}) => {
  const {
    search, title, author, isbn, category,
    page = 1, limit = 20
  } = query;

  const filter = { isDeleted: false };

  // Full-text search (title + isbn)
  const textQuery = search || title;
  if (textQuery) {
    filter.$text = { $search: textQuery };
  }

  // ISBN exact match (overrides text search for isbn)
  if (isbn && !textQuery) {
    filter.isbn = { $regex: isbn, $options: 'i' };
  }

  // Author filter (by ObjectId)
  if (author) {
    if (mongoose.isValidObjectId(author)) {
      filter.author_id = new mongoose.Types.ObjectId(author);
    } else {
      throw new AppError('Invalid author ID', 400);
    }
  }

  // Category filter (by ObjectId)
  if (category) {
    if (mongoose.isValidObjectId(category)) {
      filter.cat_id = new mongoose.Types.ObjectId(category);
    } else {
      throw new AppError('Invalid category ID', 400);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Book.countDocuments(filter);

  const books = await Book.find(filter)
    .populate('author_id', 'author_name')
    .populate('cat_id', 'cat_name')
    .populate('sh_id', 'sh_name')
    .sort({ registerDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    },
    books: books.map(toFlatBook)
  };
};

export const getBookByIdService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid book ID', 400);

  const book = await Book.findOne({ _id: id, isDeleted: false })
    .populate('author_id', 'author_name description author_photo')
    .populate('cat_id', 'cat_name')
    .populate('sh_id', 'sh_name');

  if (!book) throw new AppError('Book not found', 404);

  // Increment view count
  await Book.findByIdAndUpdate(id, { $inc: { view_count: 1 } });

  return book;
};

export const updateBookService = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid book ID', 400);

  const existing = await Book.findOne({ _id: id, isDeleted: false });
  if (!existing) throw new AppError('Book not found', 404);

  const fields = await flatToBookFields(data);

  // If qty changed, keep available_qty consistent with what's currently borrowed.
  if (fields.qty !== undefined) {
    const borrowedQty = existing.qty - existing.available_qty;
    fields.available_qty = Math.max(0, fields.qty - borrowedQty);
  }

  const book = await populateBook(
    Book.findByIdAndUpdate(id, fields, { new: true, runValidators: true })
  );

  return toFlatBook(book);
};

export const deleteBookService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid book ID', 400);

  const book = await Book.findOne({ _id: id, isDeleted: false });
  if (!book) throw new AppError('Book not found', 404);

  // Prevent deletion if copies are currently borrowed
  if (book.available_qty < book.qty) {
    throw new AppError('Cannot delete book: some copies are currently borrowed', 400);
  }

  await Book.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
  return { message: 'Book deleted successfully' };
};

// BOOK ISSUE

export const issueBookService = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { book_id, student_id, staff_id, issue_date, expected_return_date, registerBy } = data;

    // 1. Find and lock the book
    const book = await Book.findOne({ _id: book_id, isDeleted: false }).session(session);
    if (!book) throw new AppError('Book not found', 404);
    if (book.available_qty <= 0) throw new AppError('No copies available for borrowing', 400);

    // 2. Calculate dates
    const issueDateTime = issue_date ? new Date(issue_date) : new Date();
    const returnDeadline = expected_return_date
      ? new Date(expected_return_date)
      : new Date(issueDateTime.getTime() + DEFAULT_BORROW_DAYS * 24 * 60 * 60 * 1000);

    // 3. Create BookIssue record
    const [issue] = await BookIssue.create([{
      student_id: student_id || null,
      staff_id: staff_id || null,
      book_id,
      issue_date: issueDateTime,
      expected_return_date: returnDeadline,
      status: 'issued',
      registerBy: registerBy || null
    }], { session });

    // 4. Decrement available_qty
    await Book.findByIdAndUpdate(
      book_id,
      { $inc: { available_qty: -1 } },
      { session }
    );

    await session.commitTransaction();
    return await BookIssue.findById(issue._id)
      .populate('book_id', 'book_name isbn')
      .populate('student_id', 'firstName lastName admissionNumber')
      .populate('staff_id', 'stf_no');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// BOOK RETURN

export const returnBookService = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { issue_id, return_date, registerBy } = data;

    // 1. Validate issue record
    const issue = await BookIssue.findById(issue_id).session(session);
    if (!issue) throw new AppError('Issue record not found', 404);
    if (issue.status === 'returned') throw new AppError('This book has already been returned', 400);

    // 2. Calculate late days and fine
    const returnDateTime = return_date ? new Date(return_date) : new Date();
    const expectedDate = new Date(issue.expected_return_date);
    const msPerDay = 24 * 60 * 60 * 1000;
    const lateDays = Math.max(0, Math.ceil((returnDateTime - expectedDate) / msPerDay));
    const fineAmount = parseFloat((lateDays * FINE_RATE_PER_DAY).toFixed(2));

    // 3. Create BookReturn record
    const [bookReturn] = await BookReturn.create([{
      issue_id,
      return_date: returnDateTime,
      late_days: lateDays,
      fine_amount: fineAmount,
      registerBy: registerBy || null
    }], { session });

    // 4. Create LibraryFine if overdue
    let fine = null;
    if (fineAmount > 0) {
      const fineData = {
        issue_id,
        amount: fineAmount,
        reason: `Overdue by ${lateDays} day(s). Fine rate: $${FINE_RATE_PER_DAY}/day`,
        status: 'unpaid',
        registerBy: registerBy || null
      };
      if (issue.student_id) fineData.student_id = issue.student_id;
      if (issue.staff_id)   fineData.staff_id   = issue.staff_id;

      [fine] = await LibraryFine.create([fineData], { session });
    }

    // 5. Update BookIssue status
    await BookIssue.findByIdAndUpdate(
      issue_id,
      { status: 'returned', updateBy: registerBy || null },
      { session }
    );

    // 6. Increment available_qty
    await Book.findByIdAndUpdate(
      issue.book_id,
      { $inc: { available_qty: 1 } },
      { session }
    );

    await session.commitTransaction();
    return { bookReturn, fine, lateDays, fineAmount };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// BORROWING HISTORY

export const getStudentBorrowingHistoryService = async (studentId, query = {}) => {
  if (!mongoose.isValidObjectId(studentId)) throw new AppError('Invalid student ID', 400);

  const { page = 1, limit = 20, status } = query;
  const filter = { student_id: new mongoose.Types.ObjectId(studentId) };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await BookIssue.countDocuments(filter);

  const issues = await BookIssue.find(filter)
    .populate('book_id', 'book_name isbn author_id')
    .sort({ issue_date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Enrich with return records
  const issueIds = issues.map(i => i._id);
  const returns = await BookReturn.find({ issue_id: { $in: issueIds } });
  const returnMap = {};
  returns.forEach(r => { returnMap[r.issue_id.toString()] = r; });

  const enriched = issues.map(i => ({
    ...i.toObject(),
    returnRecord: returnMap[i._id.toString()] || null
  }));

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    },
    history: enriched
  };
};

export const getStaffBorrowingHistoryService = async (staffId, query = {}) => {
  if (!mongoose.isValidObjectId(staffId)) throw new AppError('Invalid staff ID', 400);

  const { page = 1, limit = 20, status } = query;
  const filter = { staff_id: new mongoose.Types.ObjectId(staffId) };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await BookIssue.countDocuments(filter);

  const issues = await BookIssue.find(filter)
    .populate('book_id', 'book_name isbn author_id')
    .sort({ issue_date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const issueIds = issues.map(i => i._id);
  const returns = await BookReturn.find({ issue_id: { $in: issueIds } });
  const returnMap = {};
  returns.forEach(r => { returnMap[r.issue_id.toString()] = r; });

  const enriched = issues.map(i => ({
    ...i.toObject(),
    returnRecord: returnMap[i._id.toString()] || null
  }));

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    },
    history: enriched
  };
};

// List every student book issue in the frontend's flat "borrow record" shape,
// joining return records (for return date) and fines (amount / paid state).
export const getAllIssuesService = async (query = {}) => {
  const filter = { student_id: { $ne: null } };
  if (query.status) filter.status = query.status;

  const issues = await BookIssue.find(filter)
    .populate('book_id', 'book_name isbn')
    .populate({
      path: 'student_id',
      select: 'firstName lastName admissionNumber classId',
      populate: { path: 'classId', select: 'cl_name' },
    })
    .sort({ issue_date: -1 })
    .limit(2000);

  const issueIds = issues.map((i) => i._id);
  const [returns, fines] = await Promise.all([
    BookReturn.find({ issue_id: { $in: issueIds } }),
    LibraryFine.find({ issue_id: { $in: issueIds } }),
  ]);
  const returnMap = {};
  returns.forEach((r) => { returnMap[r.issue_id.toString()] = r; });
  const fineMap = {};
  fines.forEach((f) => { fineMap[f.issue_id.toString()] = f; });

  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

  return issues.map((i) => {
    const r = returnMap[i._id.toString()];
    const f = fineMap[i._id.toString()];
    const s = i.student_id;
    const returned = i.status === 'returned';
    const fineAmount = f?.amount ?? r?.fine_amount ?? 0;
    return {
      id: i._id,
      bookId: i.book_id?._id ?? i.book_id,
      copyNo: 1,
      studentId: s?._id ?? i.student_id,
      studentName: s ? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() : '',
      rollNo: s?.admissionNumber ?? '',
      className: s?.classId?.cl_name ?? '',
      borrowDate: iso(i.issue_date),
      dueDate: iso(i.expected_return_date),
      returnDate: r?.return_date ? iso(r.return_date) : null,
      status: returned ? 'Returned' : 'Active',
      fine: fineAmount,
      finePaid: f ? f.status !== 'unpaid' : true,
      fineId: f?._id ?? null,
    };
  });
};

// FINES

export const getStudentFinesService = async (studentId, query = {}) => {
  if (!mongoose.isValidObjectId(studentId)) throw new AppError('Invalid student ID', 400);

  const { status, page = 1, limit = 20 } = query;
  const filter = { student_id: new mongoose.Types.ObjectId(studentId) };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await LibraryFine.countDocuments(filter);

  const fines = await LibraryFine.find(filter)
    .populate({
      path: 'issue_id',
      populate: { path: 'book_id', select: 'book_name isbn' }
    })
    .sort({ registerDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalUnpaid = await LibraryFine.aggregate([
    { $match: { student_id: new mongoose.Types.ObjectId(studentId), status: 'unpaid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    },
    totalUnpaidAmount: totalUnpaid[0]?.total || 0,
    fines
  };
};

export const updateFineStatusService = async (fineId, status, updatedBy) => {
  if (!mongoose.isValidObjectId(fineId)) throw new AppError('Invalid fine ID', 400);

  const fine = await LibraryFine.findByIdAndUpdate(
    fineId,
    { status, updateBy: updatedBy || null },
    { new: true, runValidators: true }
  );
  if (!fine) throw new AppError('Fine record not found', 404);
  return fine;
};
