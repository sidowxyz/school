import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Teacher from '../src/models/Teacher.js';
import Level from '../src/models/Level.js';
import Year from '../src/models/Year.js';
import Term from '../src/models/Term.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import StudentClass from '../src/models/StudentClass.js';
import TeacherAssignment from '../src/models/TeacherAssignment.js';
import Exam from '../src/models/Exam.js';
import Mark from '../src/models/Mark.js';

// Exams and marks, report cards in the portal, section capacity and moving
// students into the next school year.
const secret = () => process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
const bearer = (id, role) => `Bearer ${jwt.sign({ id: id.toString(), role }, secret())}`;
const ids = { admin: new mongoose.Types.ObjectId(), teacher: new mongoose.Types.ObjectId(), studentUser: new mongoose.Types.ObjectId() };
const emails = ['ex.admin@test.com', 'ex.teacher@test.com', 'ex.student@test.com'];
const c = {};
let examId;

const studentData = (n, extra) => ({
  firstName: `Ex${n}`, lastName: 'Student', admissionNumber: `EX-${n}`, gender: 'Female', birthDate: new Date('2012-01-01'),
  phoneNumber: '0615550000', address: 'Hodan', parentName: 'Parent', parentPhoneNumber: '0615550001', ...extra,
});

describe('Exams, results, capacity and promotion', () => {
  const admin = () => bearer(ids.admin, 'admin');
  const teacher = () => bearer(ids.teacher, 'teacher');
  const student = () => bearer(ids.studentUser, 'student');

  beforeAll(async () => {
    await User.deleteMany({ email: { $in: emails } });
    await User.create([
      { _id: ids.admin, firstName: 'Ex', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' },
      { _id: ids.teacher, firstName: 'Ex', lastName: 'Teacher', email: emails[1], password: 'password123', role: 'teacher' },
      { _id: ids.studentUser, firstName: 'Ex1', lastName: 'Student', email: emails[2], password: 'password123', role: 'student' },
    ]);
    c.teacher = await Teacher.create({ userId: ids.teacher, staffId: 'EX-T1' });
    c.level = await Level.create({ lev_no: 'EX-L', lev_name: 'Exam level' });
    c.year = await Year.create({ y_no: 'EX-Y1', y_name: 'Exam year 1' });
    c.year2 = await Year.create({ y_no: 'EX-Y2', y_name: 'Exam year 2' });
    c.term = await Term.create({ name: 'EX term 1', academicYearId: c.year._id, status: 'inactive' });
    c.g9 = await Class.create({ cl_no: 'EX-G9', cl_name: 'EX Grade 9', lev_no: c.level._id });
    c.g10 = await Class.create({ cl_no: 'EX-G10', cl_name: 'EX Grade 10', lev_no: c.level._id });
    c.a = await Section.create({ name: 'A', class: c.g9._id });
    c.b = await Section.create({ name: 'B', class: c.g9._id, capacity: 1 });
    c.a10 = await Section.create({ name: 'A', class: c.g10._id });
    c.math = await Subject.create({ sub_no: 'EX-S1', sub_name: 'EX Mathematics', classId: c.g9._id });
    c.s1 = await Student.create(studentData(1, { userId: ids.studentUser, classId: c.g9._id, sectionId: c.a._id }));
    c.s2 = await Student.create(studentData(2, { classId: c.g9._id, sectionId: c.a._id }));
    c.s3 = await Student.create(studentData(3, { classId: c.g9._id, sectionId: c.b._id }));
    await TeacherAssignment.create({ teacherId: c.teacher._id, subjectId: c.math._id, classId: c.g9._id, sectionId: c.a._id, termId: c.term._id });
  }, 180000);

  afterAll(async () => {
    const students = [c.s1, c.s2, c.s3].filter(Boolean).map((s) => s._id);
    await Promise.all([
      User.deleteMany({ email: { $in: emails } }),
      Teacher.deleteMany({ staffId: 'EX-T1' }),
      Level.deleteMany({ lev_no: 'EX-L' }),
      Year.deleteMany({ y_no: { $in: ['EX-Y1', 'EX-Y2'] } }),
      Term.deleteMany({ name: 'EX term 1' }),
      Class.deleteMany({ cl_no: { $in: ['EX-G9', 'EX-G10'] } }),
      Section.deleteMany({ _id: { $in: [c.a, c.b, c.a10].filter(Boolean).map((s) => s._id) } }),
      Subject.deleteMany({ sub_no: 'EX-S1' }),
      Student.deleteMany({ _id: { $in: students } }),
      StudentClass.deleteMany({ student: { $in: students } }),
      TeacherAssignment.deleteMany({ teacherId: c.teacher?._id }),
      Exam.deleteMany({ termId: c.term?._id }),
      Mark.deleteMany({ studentId: { $in: students } }),
    ]);
  }, 180000);

  it('lets the academic office create an exam, once per name per term', async () => {
    const res = await request(app).post('/api/exams').set('Authorization', admin())
      .send({ name: 'Midterm', termId: c.term._id, maxMarks: 50 });
    expect(res.status).toBe(201);
    examId = res.body.data._id;
    const dup = await request(app).post('/api/exams').set('Authorization', admin()).send({ name: 'Midterm', termId: c.term._id });
    expect(dup.status).toBe(409);
    const byTeacher = await request(app).post('/api/exams').set('Authorization', teacher()).send({ name: 'Quiz', termId: c.term._id });
    expect(byTeacher.status).toBe(403);
  });

  it('offers a teacher only the class, section and subject they teach', async () => {
    const res = await request(app).get(`/api/exams/${examId}/options`).set('Authorization', teacher());
    expect(res.status).toBe(200);
    expect(res.body.data.pairs).toEqual([{ classId: String(c.g9._id), sectionId: String(c.a._id), subjectId: String(c.math._id) }]);
  });

  it("saves a teacher's marks for their own section and refuses anything else", async () => {
    const sheet = { classId: c.g9._id, sectionId: c.a._id, subjectId: c.math._id };
    const ok = await request(app).put(`/api/exams/${examId}/marks`).set('Authorization', teacher())
      .send({ ...sheet, marks: [{ studentId: c.s1._id, score: 45 }, { studentId: c.s2._id, score: 35 }] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.saved).toBe(2);

    const tooHigh = await request(app).put(`/api/exams/${examId}/marks`).set('Authorization', teacher())
      .send({ ...sheet, marks: [{ studentId: c.s1._id, score: 51 }] });
    expect(tooHigh.status).toBe(400);

    const otherSection = await request(app).put(`/api/exams/${examId}/marks`).set('Authorization', teacher())
      .send({ classId: c.g9._id, sectionId: c.b._id, subjectId: c.math._id, marks: [{ studentId: c.s3._id, score: 40 }] });
    expect(otherSection.status).toBe(403);

    const sheetRes = await request(app).get(`/api/exams/${examId}/marksheet`).set('Authorization', teacher()).query({ classId: String(c.g9._id), sectionId: String(c.a._id), subjectId: String(c.math._id) });
    expect(sheetRes.status).toBe(200);
    expect(sheetRes.body.data.rows.find((r) => r.studentId === String(c.s1._id)).score).toBe(45);
  });

  it('works out percentages, grades and positions', async () => {
    const res = await request(app).get('/api/exams/results').set('Authorization', admin())
      .query({ termId: String(c.term._id), classId: String(c.g9._id), sectionId: String(c.a._id) });
    expect(res.status).toBe(200);
    const [first, second] = res.body.data.students;
    expect(first).toMatchObject({ percent: 90, position: 1, grade: { grade: 'A' } });
    expect(second).toMatchObject({ percent: 70, position: 2, grade: { grade: 'C' } });
  });

  it('shows students their report card only after the results are published', async () => {
    const hidden = await request(app).get('/api/portal/student/results').set('Authorization', student());
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.card).toBeNull();

    const pub = await request(app).patch(`/api/exams/${examId}/publish`).set('Authorization', admin()).send({ published: true });
    expect(pub.status).toBe(200);

    const shown = await request(app).get('/api/portal/student/results').set('Authorization', student());
    expect(shown.body.data.card).toMatchObject({ position: 1, classSize: 2, total: { percent: 90 } });
    expect(shown.body.data.card.subjects[0]).toMatchObject({ name: 'EX Mathematics', grade: { grade: 'A' } });
  });

  it('locks published marks for teachers and refuses to delete a marked exam', async () => {
    const locked = await request(app).put(`/api/exams/${examId}/marks`).set('Authorization', teacher())
      .send({ classId: c.g9._id, sectionId: c.a._id, subjectId: c.math._id, marks: [{ studentId: c.s1._id, score: 10 }] });
    expect(locked.status).toBe(403);
    const del = await request(app).delete(`/api/exams/${examId}`).set('Authorization', admin());
    expect(del.status).toBe(409);
  });

  it('refuses to move a student into a full section', async () => {
    const res = await request(app).put(`/api/students/${c.s2._id}`).set('Authorization', admin()).send({ classId: c.g9._id, sectionId: c.b._id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/full/);
    const sections = await request(app).get('/api/sections').set('Authorization', admin());
    expect(sections.body.data.find((s) => s._id === String(c.b._id))).toMatchObject({ capacity: 1, studentCount: 1 });
  });

  it('moves students into the next year, with exceptions, and never twice', async () => {
    const plan = await request(app).get('/api/promotion/plan').set('Authorization', admin()).query({ toYearId: String(c.year2._id) });
    expect(plan.status).toBe(200);
    expect(plan.body.data.classes.find((k) => k._id === String(c.g9._id))).toMatchObject({ waiting: 3 });

    // Grade 9 moves up into Grade 10 while Grade 10 graduates, in one run: the
    // students who just arrived in Grade 10 must not graduate with it.
    const run = await request(app).post('/api/promotion').set('Authorization', admin()).send({
      toYearId: c.year2._id,
      rules: [{ classId: c.g9._id, action: 'promote', toClassId: c.g10._id }, { classId: c.g10._id, action: 'graduate' }],
      exceptions: { [c.s3._id]: 'repeat' },
    });
    expect(run.status).toBe(200);
    expect(run.body.data).toMatchObject({ promoted: 2, repeated: 1, graduated: 0 });
    expect((await Student.findById(c.s1._id).lean()).status).toBe('Active');

    const moved = await Student.findById(c.s1._id).lean();
    expect(String(moved.classId)).toBe(String(c.g10._id));
    expect(String(moved.sectionId)).toBe(String(c.a10._id)); // kept the letter A
    expect(await StudentClass.countDocuments({ year: c.year2._id, student: { $in: [c.s1._id, c.s2._id, c.s3._id] } })).toBe(3);

    const again = await request(app).post('/api/promotion').set('Authorization', admin()).send({
      toYearId: c.year2._id, rules: [{ classId: c.g10._id, action: 'graduate' }],
    });
    expect(again.body.data).toMatchObject({ graduated: 0, skipped: 2 });

    const byTeacher = await request(app).get('/api/promotion/plan').set('Authorization', teacher()).query({ toYearId: String(c.year2._id) });
    expect(byTeacher.status).toBe(403);
  });
});
