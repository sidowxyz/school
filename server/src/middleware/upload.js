import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'));
};


// ORIGINAL CODE (Disk Storage):
export const uploadPhotoMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
}).single('photo');



// Student profile documents (birth certificates, transcripts, etc.)
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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|jpeg|jpg|png|doc|docx/;
  const mimetype = /pdf|image\/(jpeg|png)|msword|officedocument/.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only PDF, JPG, PNG, DOC, or DOCX files are allowed!'));
};

export const uploadStudentDocumentMiddleware = multer({
  storage: studentDocumentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: documentFilter
}).single('file');

// Memory storage for CSV bulk import
export const uploadCSVMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed!'));
  }
}).single('file');
