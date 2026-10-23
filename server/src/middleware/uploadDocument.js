import multer from 'multer';
import path from 'path';
import AppError from '../utils/AppError.js';

/**
 * Document uploads for AI review (student assignments).
 *
 * Memory storage, mirroring uploadCSVMiddleware — the file is read once for
 * text extraction and never needs to touch disk. Size limit is generous
 * relative to CSV imports because assignments run longer than
 * a data file, but still bounded: an unlimited upload is a resource-exhaustion
 * vector on a route that also makes paid model calls downstream.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.txt'].includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Only .pdf, .docx, or .txt files are allowed.'));
  },
}).single('file');

/**
 * Wraps multer so a bad upload (wrong type, too large) reaches errorHandler
 * as a proper 400 AppError. Left as a raw Error, multer's rejection falls
 * through to errorHandler's default 500 — technically a bug shared with the
 * two older upload middlewares in this file's sibling, but this is new code,
 * so it is fixed here rather than repeated.
 */
export const uploadDocumentMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('That file is too large. The limit is 15MB.', 400));
    }
    next(new AppError(err.message || 'Could not process the uploaded file.', 400));
  });
};
