import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AppError from '../utils/AppError.js';

// Upload problems (wrong type, too big) are the user's to fix: answer 400 with
// a readable message instead of a 500.
const friendly = (middleware, maxMb) => (req, res, next) => middleware(req, res, (err) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `The file is too large (the limit is ${maxMb} MB).` : 'The file could not be uploaded.';
    return next(new AppError(message, 400));
  }
  return next(new AppError(err.message || 'The file could not be uploaded.', 400));
});

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const imageFilter = (req, file, cb) => {
  const mimetype = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
  const extname = /^\.(jpe?g|png|webp)$/.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed.'));
};

export const uploadPhotoMiddleware = friendly(multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
}).single('photo'), 5);

// Student profile documents (birth certificates, transcripts, etc.). Private:
// served only through GET /api/students/:id/documents/:docId/file.
const studentDocumentDir = 'uploads/student-documents';
if (!fs.existsSync(studentDocumentDir)) {
  fs.mkdirSync(studentDocumentDir, { recursive: true });
}

const studentDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentDocumentDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const DOCUMENT_TYPES = /^(application\/pdf|image\/(jpeg|png)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

const documentFilter = (req, file, cb) => {
  const mimetype = DOCUMENT_TYPES.test(file.mimetype);
  const extname = /^\.(pdf|jpe?g|png|docx?)$/.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only PDF, JPG, PNG, DOC, or DOCX files are allowed.'));
};

export const uploadStudentDocumentMiddleware = friendly(multer({
  storage: studentDocumentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: documentFilter
}).single('file'), 10);

// Memory storage for CSV bulk import
export const uploadCSVMiddleware = friendly(multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed.'));
  }
}).single('file'), 2);
