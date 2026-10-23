import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Teacher from '../src/models/Teacher.js';
import Level from '../src/models/Level.js';
import Year from '../src/models/Year.js';
import Term from '../src/models/Term.js';
import Period from '../src/models/Period.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import TeacherAssignment from '../src/models/TeacherAssignment.js';

// The student portal timetable is built from the lessons the admin Timetable
// page saves on teacher assignments (TeacherAssignment.timetableSlots).
const studentUserId = new mongoose.Types.ObjectId();
const teacherUserId = new mongoose.Types.ObjectId();
const emails = ['sp.student@test.com', 'sp.teacher@test.com'];
let studentToken;
const created = {};

describe('Student portal timetable', () => {
  beforeAll(async () => {
    await User.deleteMany({ email: { $in: emails } });
    const secret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    studentToken = jwt.sign({ id: studentUserId.toString(), role: 'student', name: 'Portal Student' }, secret);

    await User.create([
      { _id: studentUserId, firstName: 'Portal', lastName: 'Student', email: emails[0], password: 'password123', role: 'student' },
      { _id: teacherUserId, firstName: 'Amina', lastName: 'Hassan', email: emails[1], password: 'password123', role: 'teacher' },
    ]);
    created.teacher = await Teacher.create({ userId: teacherUserId, staffId: 'SP-T-1' });
    created.level = await Level.create({ lev_no: 'SP-L1', lev_name: 'Portal level' });
    created.year = await Year.create({ y_no: 'SP-Y1', y_name: 'Portal year' });
    created.term = await Term.create({ name: 'SP term', academicYearId: created.year._id, status: 'active' });
    created.period = await Period.create({ termId: created.term._id, per_no: 'SP1', per_name: 'Period 1', time_in: '07:30', time_out: '08:15' });
    created.cls = await Class.create({ cl_no: 'SP-G5', cl_name: 'SP Grade 5', lev_no: created.level._id });
    created.sectionA = await Section.create({ name: 'A', class: created.cls._id });
    created.sectionB = await Section.create({ name: 'B', class: created.cls._id });
    created.subject = await Subject.create({ sub_no: 'SP-S1', sub_name: 'Mathematics' });
    created.student = await Student.create({
      userId: studentUserId, firstName: 'Portal', lastName: 'Student', admissionNumber: 'SP-100', gender: 'Female',
      birthDate: new Date('2015-03-01'), phoneNumber: '0615551234', address: 'Hodan',
      parentName: 'Hodan Student', parentPhoneNumber: '0615550001', classId: created.cls._id, sectionId: created.sectionA._id,
    });
    created.assignments = await TeacherAssignment.create([
      { teacherId: created.teacher._id, subjectId: created.subject._id, classId: created.cls._id, sectionId: created.sectionA._id,
        termId: created.term._id, timetableSlots: [{ day: 'Saturday', periodId: created.period._id }, { day: 'Monday', periodId: created.period._id }] },
      // Another section of the same class: must not appear for this student.
      { teacherId: created.teacher._id, subjectId: created.subject._id, classId: created.cls._id, sectionId: created.sectionB._id,
        termId: created.term._id, timetableSlots: [{ day: 'Sunday', periodId: created.period._id }] },
    ]);
  }, 180000);

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: emails } }),
      Teacher.deleteOne({ _id: created.teacher?._id }),
      Level.deleteOne({ _id: created.level?._id }),
      Year.deleteOne({ _id: created.year?._id }),
      Term.deleteOne({ _id: created.term?._id }),
      Period.deleteOne({ _id: created.period?._id }),
      Class.deleteOne({ _id: created.cls?._id }),
      Section.deleteMany({ _id: { $in: [created.sectionA?._id, created.sectionB?._id] } }),
      Subject.deleteOne({ _id: created.subject?._id }),
      Student.deleteOne({ _id: created.student?._id }),
      TeacherAssignment.deleteMany({ _id: { $in: (created.assignments ?? []).map((a) => a._id) } }),
    ]);
  }, 180000);

  it("returns the lessons placed on the timetable for the student's own section", async () => {
    const res = await request(app)
      .get('/api/portal/student/timetable')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.day).sort()).toEqual(['Monday', 'Saturday']);
    expect(res.body.data[0]).toMatchObject({
      timePeriod: '07:30 - 08:15',
      subject: { sub_name: 'Mathematics' },
      teacher: { firstName: 'Amina', lastName: 'Hassan' },
    });
  });
});
