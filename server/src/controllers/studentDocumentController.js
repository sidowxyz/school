import fs from 'fs';
import path from 'path';
import Student from '../models/Student.js';
import StudentDocument from '../models/StudentDocument.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

const POPULATE_FIELDS = [
  { path: 'uploadedBy', select: 'firstName lastName' },
  { path: 'verifiedBy', select: 'firstName lastName' },
];

// @desc   Upload a document for a student
// @route  POST /api/students/:id/documents
// @access  Admin, Principal, Academic Officer
export const uploadStudentDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false });
    if (!student) return next(new AppError('Student not found', 404));

    const fileType = path.extname(req.file.originalname).replace('.', '').toUpperCase();
    const doc = await StudentDocument.create({
      student: student._id,
      name: req.body.name || req.file.originalname,
      fileType,
      fileUrl: `/uploads/student-documents/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
    });
    const populated = await doc.populate(POPULATE_FIELDS);
    res.status(201).json(new ApiResponse(201, populated, 'Document uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   List a student's documents
// @route  GET /api/students/:id/documents
// @access  Admin, Principal, Academic Officer
export const getStudentDocuments = async (req, res, next) => {
  try {
    const docs = await StudentDocument.find({ student: req.params.id })
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, docs, 'Documents retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Mark a document as Verified
// @route  PATCH /api/students/:id/documents/:docId/verify
// @access  Admin, Principal, Academic Officer
export const verifyStudentDocument = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findOneAndUpdate(
      { _id: req.params.docId, student: req.params.id },
      { $set: { status: 'Verified', verifiedBy: req.user._id, verifiedAt: new Date() } },
      { new: true }
    ).populate(POPULATE_FIELDS);
    if (!doc) return next(new AppError('Document not found', 404));
    res.status(200).json(new ApiResponse(200, doc, 'Document verified successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Delete a document
// @route  DELETE /api/students/:id/documents/:docId
// @access  Admin, Principal, Academic Officer
export const deleteStudentDocument = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findOneAndDelete({ _id: req.params.docId, student: req.params.id });
    if (!doc) return next(new AppError('Document not found', 404));

    const filePath = path.join(process.cwd(), doc.fileUrl);
    fs.unlink(filePath, () => {}); // best-effort; a missing file shouldn't fail the delete

    res.status(200).json(new ApiResponse(200, null, 'Document deleted successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/students/:id/documents/:docId/file — student documents are private,
// so they are only handed out here, to signed-in staff, never as public files.
export const downloadStudentDocument = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findOne({ _id: req.params.docId, student: req.params.id });
    if (!doc) return next(new AppError('Document not found', 404));
    const root = path.join(process.cwd(), 'uploads', 'student-documents');
    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (!filePath.startsWith(root + path.sep)) return next(new AppError('Document not found', 404));
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) next(new AppError('The file is no longer on the server. Please upload it again.', 404));
    });
  } catch (error) {
    next(error);
  }
};
