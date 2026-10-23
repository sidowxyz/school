import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Level from '../../src/models/Level.js';
import Year from '../../src/models/Year.js';
import Class from '../../src/models/Class.js';
import Family from '../../src/models/Family.js';
import Student from '../../src/models/Student.js';
import PaymentMethod from '../../src/models/PaymentMethod.js';
import FeeStructure from '../../src/models/FeeStructure.js';
import FeeType from '../../src/models/FeeType.js';
import StudentInvoice from '../../src/models/StudentInvoice.js';
import StudentFee from '../../src/models/StudentFee.js';
import FeeReceipt from '../../src/models/FeeReceipt.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';
import { addMonths, currentPeriod, ensureFeeIndexes } from '../../src/services/monthlyFeeService.js';

// Monthly class fees: per-grade fees, monthly charging, sibling payments,
// partial payments that carry over, paying ahead, and the class/report views.
describe('Monthly fee collection', () => {
  const now = currentPeriod();
  const prev = addMonths(now, -1);
  const tokens = {};
  let grade1, grade2, cash, amina, bashir, cali;

  const post = (url, body, as = 'admin') => request(app).post(url).set('Authorization', `Bearer ${tokens[as]}`).send(body);
  const put = (url, body, as = 'admin') => request(app).put(url).set('Authorization', `Bearer ${tokens[as]}`).send(body);
  const get = (url, as = 'admin') => request(app).get(url).set('Authorization', `Bearer ${tokens[as]}`);

  const student = (firstName, classId, familyId) => Student.create({
    firstName, lastName: 'Fees', admissionNumber: `MF-${firstName}-${Date.now()}`, gender: 'Male',
    birthDate: new Date('2015-01-01'), classId, familyId, phoneNumber: '0610000000',
    address: 'Test', parentName: 'Parent Fees', parentPhoneNumber: '0619999999',
  });

  beforeAll(async () => {
    await Promise.all([User, Level, Year, Class, Family, Student, PaymentMethod, FeeStructure, FeeType, StudentInvoice, StudentFee, FeeReceipt]
      .map((M) => M.deleteMany({})));
    await ensureFeeIndexes();

    for (const role of ['admin', 'accountant', 'teacher']) {
      const u = await User.create({ firstName: 'MF', lastName: role, email: `${role}@monthly-fees.test`, password: 'password123', role });
      tokens[role] = generateAccessToken(u);
    }

    const level = await Level.create({ lev_no: 'MF-L1', lev_name: 'Primary' });
    await Year.create({ y_no: 'MF-Y1', y_name: now.slice(0, 4) });
    grade1 = await Class.create({ cl_no: 'MF-G1', cl_name: 'Grade 1', lev_no: level._id });
    grade2 = await Class.create({ cl_no: 'MF-G2', cl_name: 'Grade 2', lev_no: level._id });
    cash = await PaymentMethod.create({ payment_method_no: 'MF-CASH', payment_method_name: 'Cash' });

    const family = await Family.create({ familyName: 'Fees Family', primaryContactPhone: '0619999999' });
    amina = await student('Amina', grade1._id, family._id);
    bashir = await student('Bashir', grade2._id, family._id);
    cali = await student('Cali', grade2._id, null);
  }, 60000);

  it('sets a different monthly fee per grade, even within one level', async () => {
    expect((await put(`/api/fees/class-fees/${grade1._id}`, { amount: 30 })).status).toBe(200);
    expect((await put(`/api/fees/class-fees/${grade2._id}`, { amount: 50 })).status).toBe(200);

    const res = await get('/api/fees/class-fees');
    const fees = Object.fromEntries(res.body.data.map((c) => [c.name, c.monthly_fee]));
    expect(fees).toMatchObject({ 'Grade 1': 30, 'Grade 2': 50 });
  });

  it('applies a student\'s standing discount when the month is charged', async () => {
    const res = await put(`/api/fees/students/${cali._id}/discount`, { kind: 'amount', value: 10, reason: 'Staff child' });
    expect(res.status).toBe(200);
  });

  it('charges each active student once per month, however often it runs', async () => {
    const first = await post('/api/fees/charge', { period: prev });
    expect(first.status).toBe(201);
    expect(first.body.data.created).toBe(3);

    const again = await post('/api/fees/charge', { period: prev });
    expect(again.body.data.created).toBe(0);
    expect(again.body.data.alreadyCharged).toBe(3);

    await post('/api/fees/charge', { period: now });
    const caliMonth = await StudentInvoice.findOne({ student: cali._id, period: now });
    expect(caliMonth.invoice_amount).toBe(40); // 50 - 10 standing discount
    expect(await StudentInvoice.countDocuments({ period: { $exists: true } })).toBe(6);
  });

  it('lets the accountant collect, but not a teacher', async () => {
    expect((await get('/api/fees/students/search?q=Amina', 'teacher')).status).toBe(403);
    const res = await get('/api/fees/students/search?q=Amina', 'accountant');
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Amina Fees');
  });

  it('lists students with what they owe, filtered by class and status', async () => {
    const all = await get('/api/fees/students', 'accountant');
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(3);
    expect(all.body.data.rows.find((r) => r.name === 'Amina Fees')).toMatchObject({ className: 'Grade 1', totalOwed: 60, unpaidCount: 2 });

    const inGrade2 = await get(`/api/fees/students?class_id=${grade2._id}`);
    expect(inGrade2.body.data.rows.map((r) => r.name)).toEqual(['Bashir Fees', 'Cali Fees']);

    const owing = await get('/api/fees/students?status=owing&q=amina');
    expect(owing.body.data.rows).toHaveLength(1);
    expect((await get('/api/fees/students?class_id=nope')).status).toBe(400);
    expect((await get('/api/fees/students', 'teacher')).status).toBe(403);
  });

  it('shows a student together with their siblings and what each owes', async () => {
    const res = await get(`/api/fees/students/${amina._id}/account`, 'accountant');
    expect(res.status).toBe(200);
    const { students, totalOwed } = res.body.data;
    expect(students.map((s) => s.name)).toEqual(['Amina Fees', 'Bashir Fees']);
    expect(students[0].outstanding.map((l) => l.period)).toEqual([prev, now]);
    expect(totalOwed).toBe(160); // Amina 2 × 30 + Bashir 2 × 50
  });

  it('takes one payment for two siblings, oldest month first, on one receipt', async () => {
    const res = await post('/api/fees/collect', {
      student_ids: [amina._id.toString(), bashir._id.toString()],
      amount: 100,
      payment_method: cash._id.toString(),
      payer_name: 'Parent Fees',
    }, 'accountant');
    expect(res.status).toBe(201);

    const receipt = res.body.data;
    expect(receipt.receipt_no).toMatch(/^RCPT-\d{4}-\d{4}$/);
    expect(receipt.total).toBe(100);
    // Last month for both (30 + 50), then 20 towards Amina's current month.
    expect(receipt.lines.map((l) => [l.student.firstName, l.period, l.amount])).toEqual([
      ['Amina', prev, 30],
      ['Bashir', prev, 50],
      ['Amina', now, 20],
    ]);
    expect(await StudentFee.countDocuments({ student_fee_no: new RegExp(`^${receipt.receipt_no}-`) })).toBe(3);
  });

  it('keeps a partly paid month owing, so the rest carries forward', async () => {
    const aminaNow = await StudentInvoice.findOne({ student: amina._id, period: now });
    expect(aminaNow.status).toBe('Partially_Paid');
    expect(aminaNow.balance).toBe(10);

    const next = addMonths(now, 1);
    const status = await get(`/api/fees/classes/${grade1._id}/status?period=${next}`);
    const row = status.body.data.rows.find((r) => r.name === 'Amina Fees');
    expect(row.status).toBe('Not charged');
    expect(row.previousBalance).toBe(10);
  });

  it('refuses to take more than is owed unless paying ahead', async () => {
    const res = await post('/api/fees/collect', {
      student_ids: [cali._id.toString()], amount: 500, payment_method: cash._id.toString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/more than is owed/i);
  });

  it('pays months ahead by charging them first', async () => {
    const through = addMonths(now, 3);
    // Cali owes 40 (last month) + 40 (this month); 3 more months ahead = 200.
    const res = await post('/api/fees/collect', {
      student_ids: [cali._id.toString()], amount: 200, pay_through: through, payment_method: cash._id.toString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.data.lines).toHaveLength(5);

    const account = await get(`/api/fees/students/${cali._id}/account`);
    expect(account.body.data.students[0].totalOwed).toBe(0);
    expect(account.body.data.students[0].paidThrough).toBe(through);
  });

  it('marks one month paid when asked for that invoice only', async () => {
    const bashirNow = await StudentInvoice.findOne({ student: bashir._id, period: now });
    const res = await post('/api/fees/collect', {
      student_ids: [bashir._id.toString()], invoice_ids: [bashirNow._id.toString()], amount: 50, payment_method: cash._id.toString(),
    });
    expect(res.status).toBe(201);
    expect((await StudentInvoice.findById(bashirNow._id)).status).toBe('Paid');
  });

  it('shows who has paid in a class for a month', async () => {
    const res = await get(`/api/fees/classes/${grade2._id}/status?period=${now}`, 'accountant');
    expect(res.status).toBe(200);
    const { summary, rows } = res.body.data;
    expect(summary).toMatchObject({ students: 2, paid: 2, unpaid: 0, charged: 90, collected: 90, outstanding: 0 });
    expect(rows.find((r) => r.name === 'Cali Fees').paidAheadThrough).toBe(addMonths(now, 3));
  });

  it('reports charged, discounts, collected and outstanding by class', async () => {
    const res = await get(`/api/fees/report?from=${prev}&to=${now}`);
    expect(res.status).toBe(200);
    const byClass = Object.fromEntries(res.body.data.byClass.map((c) => [c.name, c]));
    expect(byClass['Grade 1']).toMatchObject({ net: 60, collected: 50, outstanding: 10 });
    expect(byClass['Grade 2']).toMatchObject({ charged: 200, discount: 20, net: 180, collected: 180, outstanding: 0 });
    expect(res.body.data.totals).toMatchObject({ net: 240, collected: 230, outstanding: 10 });

    const filtered = await get(`/api/fees/report?from=${prev}&to=${now}&class_id=${grade1._id}`);
    expect(filtered.body.data.byClass).toHaveLength(1);
  });

  it('lists receipts by month and finds them by receipt no. or payer', async () => {
    const all = await get(`/api/fees/receipts?from=${now}&to=${now}&limit=200`, 'accountant');
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBeGreaterThan(0);

    const one = all.body.data[0];
    const byNo = await get(`/api/fees/receipts?from=${now}&to=${now}&q=${one.receipt_no}`);
    expect(byNo.body.data.map((r) => r.receipt_no)).toEqual([one.receipt_no]);

    const byPayer = await get('/api/fees/receipts?q=parent%20fees');
    expect(byPayer.body.data.length).toBeGreaterThan(0);

    const nextYear = addMonths(now, 12);
    expect((await get(`/api/fees/receipts?from=${nextYear}&to=${nextYear}`)).body.data).toEqual([]);
    expect((await get('/api/fees/receipts?from=July')).status).toBe(400);
  });
});
