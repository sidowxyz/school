import { Readable } from 'stream';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Counter from '../models/Counter.js';
import Class from '../models/Class.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Guardian from '../models/Guardian.js';
import Family from '../models/Family.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import Residence from '../models/Residence.js';
import StudentClass from '../models/StudentClass.js';
import Term from '../models/Term.js';
import AppError from '../utils/AppError.js';
import { generatePassword } from '../utils/generatePassword.js';
import { recomputeFamilyDiscount } from './familyService.js';
import { abortTransaction, commitTransaction, startTransaction, withTransaction } from '../utils/transaction.js';

// The academic year a newly-enrolled student belongs to, absent an explicit
// yearId — whichever Term is currently marked active.
export const resolveCurrentYearId = async () => {
  const activeTerm = await Term.findOne({ status: 'active' }).sort({ createdAt: -1 });
  return activeTerm?.academicYearId ? activeTerm.academicYearId.toString() : null;
};

// Helper to generate next admission_no atomically with session support
const generateAdmissionNumber = async (session = null) => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year: currentYear },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  const paddedSeq = String(counter.seq).padStart(4, '0');
  return `ZU-${currentYear}-${paddedSeq}`;
};


const validateClassAndSection = async (classId, sectionId, session = null) => {
  const selectedClass = await Class.findById(classId).session(session);
  if (!selectedClass) throw new AppError('Selected class was not found.', 404);

  const sectionCount = await Section.countDocuments({ class: classId }).session(session);
  if (!sectionId) {
    if (sectionCount > 0) throw new AppError('Please select a section for this class.', 400);
    return null;
  }

  const selectedSection = await Section.findById(sectionId).session(session);
  if (!selectedSection || selectedSection.class.toString() !== classId.toString()) {
    throw new AppError('The selected section does not belong to this class.', 400);
  }
  return selectedSection._id;
};

export const createStudentService = async (bodyData) => {
  const session = await mongoose.startSession();
  let student;
  let parentPortalCredentials = null;
  let familyId = null;

  try {
    await withTransaction(session, async () => {
      const admissionNumber = await generateAdmissionNumber(session);
      const sectionId = await validateClassAndSection(bodyData.classId, bodyData.sectionId, session);
      const guardianInput = bodyData.guardian || {
        mode: 'new',
        name: bodyData.parentName,
        relationship: 'Guardian',
        phone: bodyData.parentPhoneNumber,
      };

      let guardian;
      if (guardianInput.mode === 'existing') {
        guardian = await Guardian.findById(guardianInput.guardianId).session(session);
        if (!guardian) throw new AppError('Selected parent or guardian was not found.', 404);
      } else {
        const email = guardianInput.email?.trim().toLowerCase() || undefined;
        const phone = guardianInput.phone?.trim();
        const duplicateConditions = [{ phone }];
        if (email) duplicateConditions.push({ email });
        const existingGuardian = await Guardian.findOne({ $or: duplicateConditions }).session(session);
        if (existingGuardian) {
          throw new AppError('This parent or guardian already exists. Choose “Existing parent/guardian” and assign the student to that family.', 409);
        }

        const [family] = await Family.create([{
          familyName: `${guardianInput.name} Family`,
          primaryContactPhone: phone,
          primaryContactEmail: email,
        }], { session });

        let userId = null;
        if (guardianInput.createPortalUser) {
          const existingUser = await User.findOne({ email }).session(session);
          if (existingUser) throw new AppError('The parent portal email is already in use.', 409);
          const temporaryPassword = generatePassword();
          const nameParts = String(guardianInput.name).trim().split(/\s+/);
          const [user] = await User.create([{
            firstName: nameParts[0] || 'Parent',
            lastName: nameParts.slice(1).join(' ') || 'Guardian',
            email,
            password: temporaryPassword,
            role: 'parent',
          }], { session });
          userId = user._id;
          parentPortalCredentials = { email, temporaryPassword };
        }

        [guardian] = await Guardian.create([{
          familyId: family._id,
          userId,
          name: guardianInput.name,
          relationship: guardianInput.relationship,
          phone,
          email,
          isPrimary: true,
        }], { session });
      }

      familyId = guardian.familyId;
      const studentData = { ...bodyData };
      delete studentData.guardian;
      delete studentData.yearId;
      Object.assign(studentData, {
        admissionNumber,
        sectionId,
        parentName: guardian.name,
        parentPhoneNumber: guardian.phone,
        familyId: guardian.familyId,
        guardians: [{ guardianId: guardian._id, isPrimary: true }],
      });

      if (studentData.email) {
        const existingStudent = await Student.findOne({ email: studentData.email, isDeleted: false }).session(session);
        if (existingStudent) throw new AppError('A student with this email address already exists.', 409);
      }

      [student] = await Student.create([studentData], { session });
      const yearId = bodyData.yearId || (await resolveCurrentYearId());
      if (yearId) {
        await StudentClass.create([{
          sc_no: `SC-${student._id}-${yearId}`,
          student: student._id,
          class: student.classId,
          section: student.sectionId ?? null,
          year: yearId,
        }], { session });
      }
    });

    await recomputeFamilyDiscount(familyId);
    student = await Student.findById(student._id)
      .populate('classId')
      .populate('sectionId')
      .populate('guardians.guardianId', 'name relationship phone email');
    return { student, parentPortalCredentials };
  } finally {
    await session.endSession();
  }
};

export const getAllStudentsService = async (filters) => {
  const {
    search,
    classId,
    sectionId,
    status,
    unassigned,
    yearId,
    page = 1,
    limit = 10
  } = filters;

  const query = {
    isDeleted: false
  };

  // Scope to whoever was actually enrolled that academic year — a student
  // graduated/created in a different year has no StudentClass row for this one.
  if (yearId) {
    const enrolledIds = await StudentClass.distinct('student', { year: yearId });
    query._id = { $in: enrolledIds };
  }

  // Used by the Parents admin UI's "assign a student" picker, so it only offers
  // students who don't already have a guardian (enforces one-parent-per-student).
  if (unassigned === 'true' || unassigned === true) {
    query.guardians = { $size: 0 };
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { admissionNumber: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  if (classId) {
    query.classId = classId;
  }

  if (sectionId) {
    query.sectionId = sectionId;
  }

  if (status) {
    query.status = status;
  }

  const currentPage = Number(page);
  const pageSize = Number(limit);

  const totalRecords = await Student.countDocuments(query);

  const students = await Student.find(query)
    .populate('classId')
    .populate('sectionId')
    .populate('guardians.guardianId', 'name phone email')
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .sort({ createdAt: -1 });

  return {
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      totalRecords
    },
    students
  };
};

export const getStudentByIdService = async (id) => {
  const student = await Student.findOne({
    _id: id,
    isDeleted: false
  })
    .populate('classId')
    .populate({
      path: 'sectionId',
      populate: { path: 'classTeacherId', select: 'staffId userId', populate: { path: 'userId', select: 'firstName lastName' } }
    })
    .populate('guardians.guardianId', 'name phone email');

  if (!student) {
    throw new AppError('Student not found.', 404);
  }

  return student;
};

export const updateStudentService = async (id, bodyData) => {

  // Prevent updating system-generated fields
  delete bodyData.admissionNumber;
  delete bodyData.guardian;
  delete bodyData.yearId;

  const currentStudent = await Student.findOne({ _id: id, isDeleted: false });
  if (!currentStudent) throw new AppError('Student not found.', 404);
  const nextClassId = bodyData.classId || currentStudent.classId;
  const nextSectionId = Object.prototype.hasOwnProperty.call(bodyData, 'sectionId')
    ? bodyData.sectionId
    : currentStudent.sectionId;
  if (bodyData.classId || Object.prototype.hasOwnProperty.call(bodyData, 'sectionId')) {
    bodyData.sectionId = await validateClassAndSection(nextClassId, nextSectionId);
  }

  if (bodyData.email) {
    const existingStudent = await Student.findOne({
      email: bodyData.email,
      _id: { $ne: id },
      isDeleted: false
    });

    if (existingStudent) {
      throw new AppError(
        'A student with this email address already exists.',
        409
      );
    }
  }

  const student = await Student.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false
    },
    {
      $set: bodyData
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('classId')
    .populate('sectionId');

  if (!student) {
    throw new AppError('Student not found.', 404);
  }

  return student;
};

export const deleteStudentService = async (id) => {
  const student = await Student.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date()
      }
    },
    {
      new: true
    }
  );

  if (!student) {
    throw new AppError(
      'Student not found or has already been deleted.',
      404
    );
  }

  return student;
};

export const updateStudentStatusService = async (id, status) => {
  const student = await Student.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false
    },
    {
      $set: { status }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!student) {
    throw new AppError('Student not found.', 404);
  }

  return student;
};

//  WEJIGA 4: TRANSACTIONS (ALL-OR-NOTHING BULK IMPORT)
export const bulkImportStudentsService = async (fileBuffer) => {
  const results = [];
  const bufferStream = Readable.from(fileBuffer.toString('utf-8'));
  
  await new Promise((resolve, reject) => {
    bufferStream.pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  //  Bilaaw Transaction Session
  const session = await mongoose.startSession();
  await startTransaction(session);

  try {
    const importedStudents = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];

      if (!row.firstName || !row.lastName || !row.p_no || !row.add_no || !row.res_no || !row.class_code || !row.section_name) {
        throw new Error(`Row ${i + 1}: Missing required fields`);
      }

      // 1. Resolve Class
      let classObj = await Class.findOne({ cl_no: row.class_code }).session(session);
      if (!classObj) {
        let levelObj = await Level.findOne({ lev_no: 'L1' }).session(session);
        if (!levelObj) {
          levelObj = (await Level.create([{ lev_no: 'L1', lev_name: 'Default Level' }], { session }))[0];
        }
        classObj = (await Class.create([{
          cl_no: row.class_code,
          cl_name: row.class_name || `Class ${row.class_code}`,
          lev_no: levelObj._id
        }], { session }))[0];
      }

      // 2. Resolve Section
      let sectionObj = await Section.findOne({ name: row.section_name, class: classObj._id }).session(session);
      if (!sectionObj) {
        sectionObj = (await Section.create([{ name: row.section_name, class: classObj._id }], { session }))[0];
      }

      // 3. Resolve Guardian
      let guardianObj = await Guardian.findOne({ p_no: row.p_no }).session(session);
      if (!guardianObj) {
        guardianObj = (await Guardian.create([{
          p_no: row.p_no,
          name: row.guardian_name || 'Unknown Parent',
          relationship: row.guardian_relationship || 'Guardian',
          phone: row.guardian_phone || '0000000000'
        }], { session }))[0];
      }

      // 4. Resolve Address
      let addressObj = await Address.findOne({ add_no: row.add_no }).session(session);
      if (!addressObj) {
        addressObj = (await Address.create([{
          add_no: row.add_no,
          city: row.address_city || 'Mogadishu',
          country: row.address_country || 'Somalia'
        }], { session }))[0];
      }

      // 5. Resolve Residence
      let residenceObj = await Residence.findOne({ res_no: row.res_no }).session(session);
      if (!residenceObj) {
        residenceObj = (await Residence.create([{ res_no: row.res_no, type: row.residence_type || 'Day Scholar' }], { session }))[0];
      }

      if (row.email) {
        const existing = await Student.findOne({ email: row.email, isDeleted: false }).session(session);
        if (existing) throw new Error(`Row ${i + 1}: Student with email ${row.email} already exists`);
      }

      const admission_no = await generateAdmissionNumber(session);
      const student = (await Student.create([{
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || null,
        admission_no,
        p_no: guardianObj._id,
        birth: new Date(row.birth || Date.now()),
        p_birth: row.p_birth || 'Unknown',
        add_no: addressObj._id,
        res_no: residenceObj._id,
        class: classObj._id,
        section: sectionObj._id,
        status: row.status || 'Active'
      }], { session }))[0];

      importedStudents.push(student);
    }

    // Haddii wax walba ay saxmeen, u oggolaan inay database-ka galaan
    await commitTransaction(session);
    session.endSession();
    return importedStudents;

  } catch (error) {
    //  HADDII HAL JEER ERROR DHACAY - DIB U LABO DHAMMAAN (ROLLBACK)
    await abortTransaction(session);
    session.endSession();
    throw error;
  }
};

export const getReferenceDataService = async () => {
  return {
    classes: await Class.find({}),
    sections: await Section.find({}),
    guardians: await Guardian.find({}),
    addresses: await Address.find({}),
    residences: await Residence.find({})
  };
};
