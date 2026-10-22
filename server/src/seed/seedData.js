import mongoose from 'mongoose';
import Class from '../models/Class.js';
import Level from '../models/Level.js';
import Section from '../models/Section.js';
import Year from '../models/Year.js';
import Family from '../models/Family.js';
import Guardian from '../models/Guardian.js';
import Address from '../models/Address.js';
import Residence from '../models/Residence.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Day from '../models/Day.js';
import Period from '../models/Period.js';
import Subject from '../models/Subject.js';
import Term from '../models/Term.js';
import Status from '../models/Status.js';
import AttendanceStatus from '../models/AttendanceStatus.js';
import StudentClass from '../models/StudentClass.js';
import StudentAttendance from '../models/StudentAttendance.js';
import AppliesTo from '../models/AppliesTo.js';
import SiblingRule from '../models/SiblingRule.js';
import { seedComprehensiveFinanceData } from './seedFinanceData.js';
import connectDB from '../config/db.js';

// Known login accounts created by the seed. Passwords are for local/dev testing only.
// Each User is linked to its profile record via `userId` so the portals and
// auth `resolveProfile` can resolve the profile from the logged-in user.
const SEED_ACCOUNTS = {
  admin:   { email: 'admin@gmail.com',    password: 'admin',        firstName: 'System', lastName: 'Admin' },
  student: { email: 'student@sobet.edu',  password: 'student',      firstName: 'Ahmad',  lastName: 'Ali' },
  parent:  { email: 'parent@sobet.edu',   password: 'parent',       firstName: 'Mohamed', lastName: 'Ali' },
  teacher: { email: 'teacher@sobet.edu',  password: 'teacher',      firstName: 'Amina',   lastName: 'Yusuf' }
};

// Upsert a seed login by email. The seed is authoritative for these known dev
// accounts: if one already exists (possibly from an older schema with a stale
// role or password), reconcile its role, status and password to the seed values.
// Password is reset by re-assigning it so the model's hashing hook runs.
const ensureUser = async (email, role, { firstName, lastName, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.role = role;
    existing.status = true;
    existing.password = password; // triggers the pre-save hash
    await existing.save();
    return existing;
  }
  return User.create({ firstName, lastName, email, password, role });
};

// Upsert a document by a natural business key and return the persisted doc.
// Idempotent and tolerant of partial prior state, unlike a single count-gate
// with hardcoded _ids (which collides if an earlier seed left some records behind).
const ensure = async (Model, findBy, createWith) => {
  const existing = await Model.findOne(findBy);
  if (existing) return existing;
  return Model.create({ ...findBy, ...createWith });
};

// Drop indexes left over from earlier schema versions. The current User model has
// no user_no/user_name fields, but a stale UNIQUE index on them makes a second user
// (user_no: null) collide. jest.setup.js drops the same ones before the test run.
const dropStaleIndexes = async () => {
  const stale = {
    users: ['user_no_1', 'user_name_1', 'userId_1', 'username_1'],
    students: ['admission_no_1'],
    guardians: ['p_no_1'],
    subjects: ['code_1']
  };
  for (const [collection, indexes] of Object.entries(stale)) {
    for (const index of indexes) {
      try {
        await mongoose.connection.db.collection(collection).dropIndex(index);
        console.log(`   dropped stale index ${collection}.${index}`);
      } catch { /* index not present — fine */ }
    }
  }
};

export const autoSeed = async () => {
  try {
    await dropStaleIndexes();

    // Reference data (idempotent per-record)
    const level = await ensure(Level, { lev_no: 'L1' }, { lev_name: 'High School' });
    const klass = await ensure(Class, { cl_no: 'G10' }, { cl_name: 'Grade 10', lev_no: level._id });
    const section = await ensure(Section, { name: 'Section A', class: klass._id }, {});
    await ensure(Address, { add_no: 'ADDR-2001' }, { street: 'Wadaada Street', city: 'Mogadishu', state: 'Banaadir', country: 'Somalia' });
    await ensure(Residence, { res_no: 'RES-3001' }, { type: 'Day Scholar', details: 'Off-campus student housing' });
    const year = await ensure(Year, { y_no: 'Y1' }, { y_name: '2026' });
    console.log('✅ Reference data ready (level, class, section, address, residence, year).');

    // Comprehensive Finance & Accounting Data (idempotent)
    await seedComprehensiveFinanceData();

    const CLASS_ID = klass._id;
    const SECTION_ID = section._id;

    // Sibling discount defaults (editable afterward from the Parents page)
    const allFees = await ensure(AppliesTo, { applies_to_id: 'AT-ALL' }, { applies_to_name: 'All Fees', description: 'Applies to every fee type' });
    await ensure(
      SiblingRule,
      { rule_id: 'SIB-2' },
      { rule_name: 'Two Siblings', minimum_siblings: 2, discount_percentage: 10, applies_to_id: allFees._id, description: '10% discount when 2 siblings are enrolled under one guardian', is_active: true }
    );
    await ensure(
      SiblingRule,
      { rule_id: 'SIB-3' },
      { rule_name: 'Three or More Siblings', minimum_siblings: 3, discount_percentage: 20, applies_to_id: allFees._id, description: '20% discount when 3+ siblings are enrolled under one guardian', is_active: true }
    );
    console.log('✅ Sibling discount rules ready (2 siblings → 10%, 3+ siblings → 20%).');

    // Academic reference layer (timetable, subjects, attendance vocab)
    await Promise.all([
      ensure(Day, { dy_no: 'D1' }, { dy_name: 'Saturday' }),
      ensure(Day, { dy_no: 'D2' }, { dy_name: 'Sunday' }),
      ensure(Day, { dy_no: 'D3' }, { dy_name: 'Monday' }),
      ensure(Day, { dy_no: 'D4' }, { dy_name: 'Tuesday' }),
      ensure(Day, { dy_no: 'D5' }, { dy_name: 'Wednesday' }),
      ensure(Day, { dy_no: 'D6' }, { dy_name: 'Thursday' })
    ]);

    // Ensure a Term exists for the Year so Periods can reference it
    const term = await ensure(Term, { name: 'Term 1', academicYearId: year._id }, { startDate: null, endDate: null, status: 'active' });

    const period = await ensure(Period, { termId: term._id, per_no: 'P1' }, { per_name: 'Period 1', time_in: '07:30 AM', time_out: '08:30 AM' });
    await Promise.all([
      ensure(Period, { termId: term._id, per_no: 'P2' }, { per_name: 'Period 2', time_in: '08:30 AM', time_out: '09:30 AM' }),
      ensure(Period, { termId: term._id, per_no: 'P3' }, { per_name: 'Period 3', time_in: '09:45 AM', time_out: '10:45 AM' }),
      ensure(Period, { termId: term._id, per_no: 'P4' }, { per_name: 'Period 4', time_in: '10:45 AM', time_out: '11:45 AM' })
    ]);

    await Promise.all([
      ensure(Subject, { sub_no: 'SUB1' }, { sub_name: 'Mathematics' }),
      ensure(Subject, { sub_no: 'SUB2' }, { sub_name: 'English' }),
      ensure(Subject, { sub_no: 'SUB3' }, { sub_name: 'Physics' }),
      ensure(Subject, { sub_no: 'SUB4' }, { sub_name: 'Biology' }),
      ensure(Subject, { sub_no: 'SUB5' }, { sub_name: 'Chemistry' }),
      ensure(Subject, { sub_no: 'SUB6' }, { sub_name: 'Islamic Studies' }),
      ensure(Subject, { sub_no: 'SUB11' }, { sub_name: 'Technology' })
    ]);

    // Student attendance statuses (referenced by StudentAttendance.st_no).
    const presentStatus = await ensure(Status, { st_no: 'S1' }, { st_name: 'Present' });
    await Promise.all([
      ensure(Status, { st_no: 'S2' }, { st_name: 'Absent' }),
      ensure(Status, { st_no: 'S3' }, { st_name: 'Late' }),
      ensure(Status, { st_no: 'S4' }, { st_name: 'Excused' })
    ]);

    // Staff attendance statuses (separate vocabulary, used by staff-attendance).
    await Promise.all([
      ensure(AttendanceStatus, { status_no: 'AS-1' }, { status_name: 'Present' }),
      ensure(AttendanceStatus, { status_no: 'AS-2' }, { status_name: 'Absent' }),
      ensure(AttendanceStatus, { status_no: 'AS-3' }, { status_name: 'Late' }),
      ensure(AttendanceStatus, { status_no: 'AS-4' }, { status_name: 'Excused' })
    ]);
    console.log('✅ Academic layer ready (6 days, 4 periods, 5 subjects, attendance statuses).');

    // Login accounts, each linked to its profile via userId

    // 1. Admin — no profile record, just a login.
    const adminUser = await ensureUser(SEED_ACCOUNTS.admin.email, 'admin', SEED_ACCOUNTS.admin);

    // 2. Parent — Family + Guardian, Guardian.userId → parent User.
    const parentUser = await ensureUser(SEED_ACCOUNTS.parent.email, 'parent', SEED_ACCOUNTS.parent);
    let family = await Family.findOne({ 
      $or: [{ primaryContactEmail: SEED_ACCOUNTS.parent.email }, { familyName: 'Ali Family' }] 
    });
    if (!family) {
      family = await Family.create({
        familyName: 'Ali Family',
        primaryContactPhone: '0615123456',
        primaryContactEmail: SEED_ACCOUNTS.parent.email
      });
    } else {
      family.primaryContactEmail = SEED_ACCOUNTS.parent.email;
      await family.save();
    }
    
    let guardian = await Guardian.findOne({ 
      $or: [{ userId: parentUser._id }, { email: SEED_ACCOUNTS.parent.email }] 
    });
    if (!guardian) {
      guardian = await Guardian.create({
        familyId: family._id,
        userId: parentUser._id,           // ← the link the portals rely on
        name: 'Mohamed Ali',
        relationship: 'Father',
        phone: '0615123456',
        email: SEED_ACCOUNTS.parent.email,
        isPrimary: true
      });
    } else {
      guardian.userId = parentUser._id;
      guardian.email = SEED_ACCOUNTS.parent.email;
      await guardian.save();
    }

    // 3. Student — Student record, Student.userId → student User.
    const studentUser = await ensureUser(SEED_ACCOUNTS.student.email, 'student', SEED_ACCOUNTS.student);
    let student = await Student.findOne({ 
      $or: [{ userId: studentUser._id }, { admissionNumber: 'ZU-2026-0001' }] 
    });
    if (!student) {
      student = await Student.create({
        firstName: 'Ahmad',
        lastName: 'Ali',
        email: SEED_ACCOUNTS.student.email,
        userId: studentUser._id,          // ← the link the portals + IDOR guard rely on
        admissionNumber: 'ZU-2026-0001',
        gender: 'Male',
        birthDate: new Date('2010-01-01'),
        classId: CLASS_ID,
        sectionId: SECTION_ID,
        phoneNumber: '0615123456',
        address: 'Mogadishu',
        parentName: 'Mohamed Ali',
        parentPhoneNumber: '0615123456',
        familyId: family._id,
        // Link to the guardian so the parent portal (Student.guardians.guardianId) finds this child.
        guardians: [{ guardianId: guardian._id, isPrimary: true }],
        status: 'Active'
      });
    } else {
      student.userId = studentUser._id;
      student.email = SEED_ACCOUNTS.student.email;
      student.guardians = [{ guardianId: guardian._id, isPrimary: true }];
      await student.save();
    }

    // 4. Teacher — Teacher record, Teacher.userId → teacher User.
    const teacherUser = await ensureUser(SEED_ACCOUNTS.teacher.email, 'teacher', SEED_ACCOUNTS.teacher);
    let teacher = await Teacher.findOne({ userId: teacherUser._id });
    if (!teacher) {
      teacher = await Teacher.create({
        userId: teacherUser._id,
        staffId: 'TCH-0001',
        department: 'Mathematics',
        qualifications: 'B.Sc. Mathematics',
        phone: '+252-61-7890123',
        experience: '8',
        status: 'Active'
      });
    }

    // Enrolment + a sample attendance record
    // Enrol the seeded student in the class/year so attendance, marks and results
    // have a StudentClass to hang on (attendance keys on sc_no, not the student).
    const studentClass = await ensure(
      StudentClass,
      { student: student._id, class: CLASS_ID, year: year._id },
      { sc_no: 'SC-1001' }
    );

    await ensure(
      StudentAttendance,
      { studentId: student._id, periodId: period._id, att_date: new Date('2026-07-01T00:00:00.000Z') },
      { status: 'Present', remarks: 'Seed sample' }
    );
    console.log('✅ Enrolment ready (student enrolled, 1 sample attendance record).');

    console.log('✅ Seed accounts ready (email / password):');
    console.log(`   admin   → ${SEED_ACCOUNTS.admin.email} / ${SEED_ACCOUNTS.admin.password}`);
    console.log(`   student → ${SEED_ACCOUNTS.student.email} / ${SEED_ACCOUNTS.student.password}  (linked to student ${student.admissionNumber})`);
    console.log(`   parent  → ${SEED_ACCOUNTS.parent.email} / ${SEED_ACCOUNTS.parent.password}  (linked to guardian ${guardian.name})`);
    console.log(`   teacher → ${SEED_ACCOUNTS.teacher.email} / ${SEED_ACCOUNTS.teacher.password}`);
    console.log(`   userId links: admin=${adminUser._id} student=${studentUser._id} parent=${parentUser._id} teacher=${teacherUser._id}`);
  } catch (error) {
    console.error('⚠️  Seeding error:', error.message);
    throw error;
  }
};

// Allow running this script directly:  node src/seed/seedData.js
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  (async () => {
    await connectDB();
    await autoSeed();
    await mongoose.connection.close();
    process.exit(0);
  })();
}
