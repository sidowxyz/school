import mongoose from 'mongoose';
import { Readable } from 'stream';
import csv from 'csv-parser';

// Models
import Student    from '../models/Student.js';
import Counter    from '../models/Counter.js';
import Class      from '../models/Class.js';
import Level      from '../models/Level.js';
import Section    from '../models/Section.js';
import Family     from '../models/Family.js';
import Guardian   from '../models/Guardian.js';
import Address    from '../models/Address.js';
import Residence  from '../models/Residence.js';
import User        from '../models/User.js';

// Utilities
import AppError     from '../utils/AppError.js';

// Services
import ApiResponse  from '../utils/ApiResponse.js';
import * as studentService from '../services/studentService.js';
import { generatePassword } from '../utils/generatePassword.js';

// Helper: generate unique Admission Number
const generateAdmissionNo = async () => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year: currentYear },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `ZU-${currentYear}-${String(counter.seq).padStart(4, '0')}`;
};

// @desc   Create a new student
// @route  POST /api/students
export const createStudent = async (req, res, next) => {
  try {
    const { student, parentPortalCredentials } = await studentService.createStudentService(req.body);
    const data = student.toObject ? student.toObject() : student;
    if (parentPortalCredentials) data.parentPortalCredentials = parentPortalCredentials;
    res.status(201).json(new ApiResponse(201, data, 'Student and guardian registered successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Get all students with search, filter & pagination
// @route  GET /api/students
export const getStudents = async (req, res, next) => {
  try {
    const { pagination, students } = await studentService.getAllStudentsService(req.query);
    res.status(200).json(new ApiResponse(200, { pagination, students }, 'Students retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Get student by ID
// @route  GET /api/students/:id
export const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentByIdService(req.params.id);
    res.status(200).json(new ApiResponse(200, student, 'Student retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Update student details
// @route  PUT /api/students/:id
export const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudentService(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, student, 'Student updated successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Soft delete student
// @route  DELETE /api/students/:id
export const deleteStudent = async (req, res, next) => {
  try {
    await studentService.deleteStudentService(req.params.id);
    res.status(200).json(new ApiResponse(200, null, 'Student deleted successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Update student enrollment status
// @route  PATCH /api/students/:id/status
export const updateStudentStatus = async (req, res, next) => {
  try {
    const student = await studentService.updateStudentStatusService(req.params.id, req.body.status);
    res.status(200).json(new ApiResponse(200, student, 'Student status updated successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Bulk import students via CSV
// @route  POST /api/students/bulk-import
export const bulkImportStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a CSV file', 400));
    }

    const results = [];
    const bufferStream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      bufferStream.pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const importedStudents = [];
    const errors = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        if (!row.firstName || !row.lastName || !row.add_no || !row.res_no || !row.class_code || !row.section_name) {
          throw new Error('Missing required fields');
        }

        let classObj = await Class.findOne({ cl_no: row.class_code });
        if (!classObj) {
          let levelObj = await Level.findOne({ lev_no: 'L1' });
          if (!levelObj) levelObj = await Level.create({ lev_no: 'L1', lev_name: 'Default Level' });
          classObj = await Class.create({
            cl_no: row.class_code,
            cl_name: row.class_name || `Class ${row.class_code}`,
            lev_no: levelObj._id
          });
        }

        let sectionObj = await Section.findOne({ name: row.section_name, class: classObj._id });
        if (!sectionObj) sectionObj = await Section.create({ name: row.section_name, class: classObj._id });

        let familyObj = await Family.findOne({ primaryContactPhone: row.guardian_phone || '0000000000' });
        let guardianObj = null;

        if (!familyObj) {
          familyObj = await Family.create({
            familyName: `${row.lastName} Family`,
            primaryContactPhone: row.guardian_phone || '0000000000',
            primaryContactEmail: row.guardian_email || null
          });
          guardianObj = await Guardian.create({
            familyId:     familyObj._id,
            name:         row.guardian_name || 'Unknown Parent',
            relationship: row.guardian_relationship || 'Guardian',
            phone:        row.guardian_phone || '0000000000',
            email:        row.guardian_email || null,
            isPrimary:    true
          });
        } else {
          guardianObj = await Guardian.findOne({ familyId: familyObj._id });
        }

        let addressObj = await Address.findOne({ add_no: row.add_no });
        if (!addressObj) {
          addressObj = await Address.create({
            add_no:  row.add_no,
            street:  row.address_street  || null,
            city:    row.address_city    || 'Mogadishu',
            state:   row.address_state   || null,
            country: row.address_country || 'Somalia'
          });
        }

        let residenceObj = await Residence.findOne({ res_no: row.res_no });
        if (!residenceObj) {
          residenceObj = await Residence.create({
            res_no:  row.res_no,
            type:    row.residence_type    || 'Day Scholar',
            details: row.residence_details || null
          });
        }

        if (row.email) {
          const existing = await Student.findOne({ email: row.email, isDeleted: false });
          if (existing) throw new Error(`Student with email ${row.email} already exists`);
        }

        const admission_no = await generateAdmissionNo();
        const student = await Student.create({
          firstName:  row.firstName,
          lastName:   row.lastName,
          email:      row.email || null,
          admission_no,
          familyId:   familyObj._id,
          guardians:  guardianObj ? [{ guardianId: guardianObj._id, isPrimary: true }] : [],
          birth:      new Date(row.birth || Date.now()),
          p_birth:    row.p_birth || 'Unknown',
          add_no:     addressObj._id,
          res_no:     residenceObj._id,
          class:      classObj._id,
          section:    sectionObj._id,
          status:     row.status || 'Active'
        });

        importedStudents.push(student);
      } catch (err) {
        errors.push({ rowNumber: i + 1, error: err.message });
      }
    }

    res.status(200).json(new ApiResponse(200, { imported: importedStudents, errors }, 'Bulk import completed'));
  } catch (error) {
    next(error);
  }
};

// @desc   Upload student profile photo
// @route  POST /api/students/:id/photo
export const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an image file', 400));
    }
    const photoUrl = `/uploads/${req.file.filename}`;
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { photoUrl } },
      { new: true }
    );
    if (!student) return next(new AppError('Student not found', 404));
    res.status(200).json(new ApiResponse(200, student, 'Photo uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Stream student photo from GridFS
// @route  GET /api/students/photo/:fileId
export const getPhoto = async (req, res, next) => {
  try {
    const db     = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'student_photos' });
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const files  = await bucket.find({ _id: fileId }).toArray();

    if (!files || files.length === 0) {
      return next(new AppError('Photo not found', 404));
    }

    res.setHeader('Content-Type', files[0].contentType);
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc   Get reference data for student forms (classes, sections, etc.)
// @route  GET /api/students/reference-data
export const getReferenceData = async (req, res, next) => {
  try {
    const [classes, sections, guardians, families, addresses, residences] = await Promise.all([
      Class.find({}),
      Section.find({}),
      Guardian.find({}).populate('familyId', 'siblingCount discountTier').sort({ name: 1 }),
      Family.find({}),
      Address.find({}),
      Residence.find({})
    ]);
    const guardianIds = guardians.map((guardian) => guardian._id);
    const childCounts = await Student.aggregate([
      { $match: { isDeleted: false, 'guardians.guardianId': { $in: guardianIds } } },
      { $unwind: '$guardians' },
      { $group: { _id: '$guardians.guardianId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(childCounts.map((item) => [item._id.toString(), item.count]));
    const guardianOptions = guardians.map((guardian) => ({
      ...guardian.toObject(),
      childrenCount: countMap.get(guardian._id.toString()) || 0,
    }));
    res.status(200).json(new ApiResponse(200, {
      classes, sections, guardians: guardianOptions, families, addresses, residences
    }, 'Reference data retrieved'));
  } catch (error) {
    next(error);
  }
};

// @desc   Create a login account for a student who has no account yet
// @route  POST /api/students/:id/account
export const createStudentAccount = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false });
    if (!student) return next(new AppError('Student not found', 404));

    if (student.userId) {
      return next(new AppError('This student already has a linked account', 400));
    }

    const { email, password } = req.body;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return next(new AppError('Enter a valid email address for the login.', 400));
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
      return next(new AppError('The password must be at least 8 characters.', 400));
    }
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return next(new AppError('Email already in use', 400));

    const temporaryPassword = password || generatePassword();

    const account = await User.create({
      firstName: student.firstName,
      lastName: student.lastName,
      email,
      password: temporaryPassword,
      role: 'student'
    });

    student.userId = account._id;
    await student.save();

    const accountResponse = account.toObject();
    delete accountResponse.password;

    res.status(201).json(new ApiResponse(201, {
      account: accountResponse,
      student,
      // Only returned once, at creation time — the hash is all that's stored after this.
      temporaryPassword,
    }, 'Student account created successfully'));
  } catch (error) {
    next(error);
  }
};
