import mongoose from 'mongoose';
import ReadingSession from '../models/ReadingSession.js';
import AppError from '../utils/AppError.js';

/**
 * In-library reading sessions — a student picks up a book, reads it in the
 * library without borrowing, and the librarian logs the session with an
 * optional check-out time and hours read.
 *
 * Split from the old `lateFineReadingService.js` (2026-08-19). That file
 * mixed this domain with the dead `LateFine` model, whose parallel fine
 * ledger was never written by anything the app runs. `LibraryFine`, tied to
 * a `BookIssue`, is the only fine model still in use.
 */

export const createReadingSessionService = async (data) => {
  const session = await ReadingSession.create(data);
  return session.populate([
    { path: 'st_id', select: 'firstName lastName admissionNumber' },
    { path: 'book_id', select: 'book_name isbn' }
  ]);
};

export const getAllReadingSessionsService = async (query = {}) => {
  const { st_id, book_id, status, page = 1, limit = 20 } = query;

  const filter = {};
  if (st_id) {
    if (!mongoose.isValidObjectId(st_id)) throw new AppError('Invalid student ID', 400);
    filter.st_id = new mongoose.Types.ObjectId(st_id);
  }
  if (book_id) {
    if (!mongoose.isValidObjectId(book_id)) throw new AppError('Invalid book ID', 400);
    filter.book_id = new mongoose.Types.ObjectId(book_id);
  }
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await ReadingSession.countDocuments(filter);

  const sessions = await ReadingSession.find(filter)
    .populate('st_id', 'firstName lastName admissionNumber')
    .populate('book_id', 'book_name isbn')
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
    sessions
  };
};

export const getReadingSessionByIdService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid session ID', 400);

  const session = await ReadingSession.findById(id)
    .populate('st_id', 'firstName lastName admissionNumber')
    .populate('book_id', 'book_name isbn');

  if (!session) throw new AppError('Reading session not found', 404);
  return session;
};

export const updateReadingSessionService = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid session ID', 400);

  // Auto-calculate hoursRead when the caller supplies a check-out time and
  // hasn't overridden the duration themselves.
  if (data.timeOut && !data.hoursRead) {
    const existing = await ReadingSession.findById(id);
    if (existing && existing.registerDate) {
      const ms = new Date(data.timeOut) - new Date(existing.registerDate);
      data.hoursRead = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
    }
  }

  const session = await ReadingSession.findByIdAndUpdate(
    id,
    { ...data, updateBy: data.updateBy || null },
    { new: true, runValidators: true }
  )
    .populate('st_id', 'firstName lastName admissionNumber')
    .populate('book_id', 'book_name isbn');

  if (!session) throw new AppError('Reading session not found', 404);
  return session;
};

export const deleteReadingSessionService = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid session ID', 400);
  const session = await ReadingSession.findByIdAndDelete(id);
  if (!session) throw new AppError('Reading session not found', 404);
  return { message: 'Reading session deleted successfully' };
};

/** Total sessions, total hours, and full session history for one student. */
export const getStudentReadingStatsService = async (studentId) => {
  if (!mongoose.isValidObjectId(studentId)) throw new AppError('Invalid student ID', 400);

  const stId = new mongoose.Types.ObjectId(studentId);
  const stats = await ReadingSession.aggregate([
    { $match: { st_id: stId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$hoursRead' }
      }
    }
  ]);

  const sessions = await ReadingSession.find({ st_id: stId })
    .populate('book_id', 'book_name isbn')
    .sort({ registerDate: -1 });

  const totalHours = stats.reduce((acc, s) => acc + s.totalHours, 0);
  const completed = stats.find((s) => s._id === 'completed')?.count || 0;

  return {
    sessions,
    stats,
    totalHours: parseFloat(totalHours.toFixed(2)),
    booksCompleted: completed
  };
};
