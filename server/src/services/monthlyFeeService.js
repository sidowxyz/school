import mongoose from 'mongoose';
import Class from '../models/Class.js';
import FeeStructure from '../models/FeeStructure.js';
import FeeType from '../models/FeeType.js';
import FeeReceipt from '../models/FeeReceipt.js';
import Student from '../models/Student.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Year from '../models/Year.js';
import { buildInvoiceForStudent, computeStudentDiscount } from './invoiceService.js';
import { applyPaymentToInvoice, generateFeeNumber } from './paymentService.js';
import { abortTransaction, commitTransaction, startTransaction } from '../utils/transaction.js';

/*
 * Monthly school fees.
 *
 * Each class has one monthly fee (a FeeStructure with billing 'monthly'). Every
 * month each active student is charged that fee as an ordinary StudentInvoice
 * tagged with the month (`period`, 'YYYY-MM'), so balances, receipts, the
 * ledger and the student/parent portals all keep working unchanged.
 *
 * Unpaid or partly paid months simply stay open, so whatever is left is still
 * owed next month. Payments are applied oldest month first; paying ahead
 * creates the future months' invoices and pays them.
 */

const MONTHLY_FEE_TYPE = { fee_type_no: 'FT-MONTHLY', fee_name: 'Monthly Tuition' };
const round2 = (n) => Math.round(n * 100) / 100;

export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const currentPeriod = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const addMonths = (period, n) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const periodsBetween = (from, to) => {
  const out = [];
  for (let p = from; p <= to && out.length < 120; p = addMonths(p, 1)) out.push(p);
  return out;
};

const fail = (statusCode, message) => ({ statusCode, message });

/** The FeeStructure index changed to include class_id; drop the old one. */
export const ensureFeeIndexes = async () => {
  await FeeStructure.syncIndexes();
  await StudentInvoice.syncIndexes();
  await FeeReceipt.init();
};

const resolveYear = async () => {
  const thisYear = String(new Date().getFullYear());
  const year = (await Year.findOne({ y_name: new RegExp(thisYear) })) ?? (await Year.findOne().sort({ createdAt: -1 }));
  if (!year) throw fail(400, 'Create an academic year first (Academic Structure), then set class fees.');
  return year;
};

const monthlyFeeType = async () =>
  FeeType.findOneAndUpdate(
    { fee_type_no: MONTHLY_FEE_TYPE.fee_type_no },
    { $setOnInsert: MONTHLY_FEE_TYPE },
    { new: true, upsert: true }
  );

const monthlyFeeFor = (classId) => FeeStructure.findOne({ class_id: classId, billing: 'monthly' });

// ─── Class fees ──────────────────────────────────────────────────────────────

export const getClassFees = async () => {
  const [classes, fees, counts] = await Promise.all([
    Class.find().populate('lev_no', 'lev_name').sort({ cl_name: 1 }),
    FeeStructure.find({ billing: 'monthly' }),
    Student.aggregate([
      { $match: { isDeleted: false, status: 'Active' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
  ]);
  const feeByClass = new Map(fees.map((f) => [String(f.class_id), f]));
  const countByClass = new Map(counts.map((c) => [String(c._id), c.count]));
  return classes.map((c) => ({
    _id: c._id,
    name: c.cl_name,
    level: c.lev_no?.lev_name ?? '',
    level_id: c.lev_no?._id ?? null,
    students: countByClass.get(String(c._id)) ?? 0,
    monthly_fee: feeByClass.has(String(c._id)) ? feeByClass.get(String(c._id)).amount : null,
  }));
};

export const setClassFee = async (classId, amount, userName) => {
  const klass = await Class.findById(classId);
  if (!klass) throw fail(404, 'Class not found');

  const existing = await monthlyFeeFor(classId);
  if (existing) {
    existing.amount = amount;
    existing.updateBy = userName;
    existing.updateDate = new Date();
    return existing.save();
  }

  const [feeType, year] = await Promise.all([monthlyFeeType(), resolveYear()]);
  return FeeStructure.create({
    fee_struc_no: `FS-MONTHLY-${klass.cl_no}`,
    fee_type_no: feeType._id,
    lev_no: klass.lev_no,
    y_no: year._id,
    amount,
    class_id: klass._id,
    billing: 'monthly',
    updateBy: userName,
  });
};

// ─── Charging ────────────────────────────────────────────────────────────────

const dueDateFor = (period) => `${period}-10`;

/** Charge one student one month (no-op if already charged). Returns the invoice. */
export const chargeStudentMonth = async (student, period, session = null) => {
  const fee = await monthlyFeeFor(student.classId);
  if (!fee) throw fail(400, `No monthly fee is set for ${student.firstName} ${student.lastName}'s class yet.`);

  const existing = await StudentInvoice.findOne({ student: student._id, fee_struc_no: fee._id, period }).session(session);
  if (existing) return existing;

  return buildInvoiceForStudent(student._id, fee._id, { period, class_id: fee.class_id, dueDate: dueDateFor(period) }, session);
};

/**
 * Charge every active student in every class with a monthly fee (or one class)
 * for `period`. Safe to run repeatedly: students already charged are skipped,
 * so it also picks up students enrolled after the first run.
 */
export const chargeMonth = async ({ period = currentPeriod(), classId } = {}) => {
  if (!PERIOD_RE.test(period)) throw fail(400, 'Month must look like 2026-07.');

  const fees = await FeeStructure.find({ billing: 'monthly', ...(classId ? { class_id: classId } : {}) });
  let created = 0;
  let alreadyCharged = 0;
  const failed = [];

  for (const fee of fees) {
    const students = await Student.find({ classId: fee.class_id, isDeleted: false, status: 'Active' }).select('_id firstName lastName');
    const charged = new Set(
      (await StudentInvoice.find({ fee_struc_no: fee._id, period, student: { $in: students.map((s) => s._id) } }).distinct('student')).map(String)
    );

    for (const s of students) {
      if (charged.has(String(s._id))) { alreadyCharged += 1; continue; }
      try {
        await buildInvoiceForStudent(s._id, fee._id, { period, class_id: fee.class_id, dueDate: dueDateFor(period) });
        created += 1;
      } catch (err) {
        if (err?.code === 11000) { alreadyCharged += 1; continue; } // charged concurrently
        failed.push({ student: `${s.firstName} ${s.lastName}`, message: err?.message ?? String(err) });
      }
    }
  }

  return { period, classes: fees.length, created, alreadyCharged, failed };
};

// ─── Finding students and their account ─────────────────────────────────────

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every active student with what they owe, for the cashier's pick list.
 * Filters: class_id, status ('owing' | 'paid'), q (name / admission no. /
 * parent). Sorted by name; paged after filtering so totals stay correct.
 */
export const listStudentBalances = async ({ class_id, status, q, page = 1, limit = 25 } = {}) => {
  const filter = { isDeleted: false, status: 'Active' };
  if (class_id) {
    if (!mongoose.isValidObjectId(class_id)) throw fail(400, 'Unknown class.');
    filter.classId = class_id;
  }
  const term = String(q ?? '').trim();
  if (term) {
    const parts = term.split(/\s+/).map((p) => new RegExp(escapeRegex(p), 'i'));
    filter.$and = parts.map((re) => ({ $or: [{ firstName: re }, { lastName: re }, { admissionNumber: re }, { parentName: re }, { parentPhoneNumber: re }] }));
  }

  const students = await Student.find(filter)
    .select('firstName lastName admissionNumber classId familyId parentName')
    .populate('classId', 'cl_name')
    .populate('familyId', 'familyName')
    .sort({ firstName: 1, lastName: 1 });
  const ids = students.map((s) => s._id);

  const [owed, paid] = await Promise.all([
    StudentInvoice.aggregate([
      { $match: { student: { $in: ids }, status: { $ne: 'Paid' } } },
      { $group: { _id: '$student', balance: { $sum: '$balance' }, unpaid: { $sum: 1 } } },
    ]),
    StudentInvoice.aggregate([
      { $match: { student: { $in: ids }, period: { $exists: true }, status: 'Paid' } },
      { $group: { _id: '$student', paidThrough: { $max: '$period' } } },
    ]),
  ]);
  const owedBy = new Map(owed.map((o) => [String(o._id), o]));
  const paidBy = new Map(paid.map((p) => [String(p._id), p.paidThrough]));

  let rows = students.map((s) => {
    const o = owedBy.get(String(s._id));
    return {
      _id: s._id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      className: s.classId?.cl_name ?? '',
      familyName: s.familyId?.familyName ?? null,
      parentName: s.parentName ?? '',
      totalOwed: round2(o?.balance ?? 0),
      unpaidCount: o?.unpaid ?? 0,
      paidThrough: paidBy.get(String(s._id)) ?? null,
    };
  });
  if (status === 'owing') rows = rows.filter((r) => r.totalOwed > 0);
  if (status === 'paid') rows = rows.filter((r) => r.totalOwed === 0);

  const size = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  return {
    rows: rows.slice((current - 1) * size, current * size),
    total: rows.length,
    page: current,
    pages,
    totalOwed: round2(rows.reduce((sum, r) => sum + r.totalOwed, 0)),
    owingCount: rows.filter((r) => r.totalOwed > 0).length,
  };
};

export const searchStudents = async (q) => {
  const term = String(q ?? '').trim();
  if (term.length < 2) return [];
  const parts = term.split(/\s+/).map((p) => new RegExp(escapeRegex(p), 'i'));
  const students = await Student.find({
    isDeleted: false,
    $and: parts.map((re) => ({ $or: [{ firstName: re }, { lastName: re }, { admissionNumber: re }, { parentName: re }, { parentPhoneNumber: re }] })),
  })
    .select('firstName lastName admissionNumber classId familyId status parentName')
    .populate('classId', 'cl_name')
    .populate('familyId', 'familyName')
    .limit(10);

  return students.map((s) => ({
    _id: s._id,
    name: `${s.firstName} ${s.lastName}`,
    admissionNumber: s.admissionNumber,
    className: s.classId?.cl_name ?? '',
    familyName: s.familyId?.familyName ?? null,
    parentName: s.parentName ?? '',
    status: s.status,
  }));
};

const invoiceLabel = (inv) => inv.fee_struc_no?.fee_type_no?.fee_name ?? 'Fee';

const toLine = (inv) => ({
  invoiceId: inv._id,
  invoice_no: inv.invoice_no,
  period: inv.period ?? null,
  description: invoiceLabel(inv),
  amount: inv.invoice_amount,
  original: inv.original_amount ?? inv.invoice_amount,
  discount: inv.discount_amount ?? 0,
  paid: inv.paid_amount,
  balance: inv.balance,
  status: inv.status,
});

// Oldest debt first: by month (one-off invoices by their creation month).
const owedOrder = (a, b) => {
  const pa = a.period ?? currentPeriod(a.registerDate ?? a.createdAt);
  const pb = b.period ?? currentPeriod(b.registerDate ?? b.createdAt);
  if (pa !== pb) return pa < pb ? -1 : 1;
  return (a.registerDate ?? 0) - (b.registerDate ?? 0);
};

/**
 * Everything the cashier needs for one student and their siblings: what each
 * child owes month by month, their monthly fee after discounts, and how far
 * ahead they have paid.
 */
export const getAccount = async (studentId) => {
  const student = await Student.findOne({ _id: studentId, isDeleted: false }).populate('familyId', 'familyName primaryContactPhone');
  if (!student) throw fail(404, 'Student not found');

  const members = student.familyId
    ? await Student.find({ familyId: student.familyId._id, isDeleted: false, $or: [{ status: 'Active' }, { _id: student._id }] })
    : [student];
  // The searched-for student first, then siblings by name.
  members.sort((a, b) => (String(a._id) === String(studentId) ? -1 : String(b._id) === String(studentId) ? 1 : a.firstName.localeCompare(b.firstName)));

  const ids = members.map((m) => m._id);
  const [classes, fees, invoices, lastPaid] = await Promise.all([
    Class.find({ _id: { $in: members.map((m) => m.classId).filter(Boolean) } }).select('cl_name'),
    FeeStructure.find({ billing: 'monthly', class_id: { $in: members.map((m) => m.classId).filter(Boolean) } }),
    StudentInvoice.find({ student: { $in: ids }, status: { $ne: 'Paid' } })
      .populate({ path: 'fee_struc_no', populate: { path: 'fee_type_no', select: 'fee_name' } }),
    StudentInvoice.aggregate([
      { $match: { student: { $in: ids }, period: { $exists: true }, status: 'Paid' } },
      { $group: { _id: '$student', paidThrough: { $max: '$period' } } },
    ]),
  ]);
  const className = new Map(classes.map((c) => [String(c._id), c.cl_name]));
  const feeByClass = new Map(fees.map((f) => [String(f.class_id), f.amount]));
  const paidThrough = new Map(lastPaid.map((p) => [String(p._id), p.paidThrough]));

  const students = await Promise.all(members.map(async (m) => {
    const fee = m.classId ? feeByClass.get(String(m.classId)) : undefined;
    const preview = fee !== undefined ? await computeStudentDiscount(m, fee) : null;
    const owed = invoices.filter((i) => String(i.student) === String(m._id)).sort(owedOrder).map(toLine);
    return {
      _id: m._id,
      name: `${m.firstName} ${m.lastName}`,
      admissionNumber: m.admissionNumber,
      className: m.classId ? className.get(String(m.classId)) ?? '' : '',
      status: m.status,
      monthlyFee: preview ? { amount: fee, net: preview.invoice_amount, discount: preview.discount_amount, parts: preview.parts } : null,
      feeDiscount: m.fee_discount?.kind ? m.fee_discount : null,
      paidThrough: paidThrough.get(String(m._id)) ?? null,
      outstanding: owed,
      totalOwed: round2(owed.reduce((s, l) => s + l.balance, 0)),
    };
  }));

  return {
    family: student.familyId ? { _id: student.familyId._id, name: student.familyId.familyName, phone: student.familyId.primaryContactPhone } : null,
    currentPeriod: currentPeriod(),
    students,
    totalOwed: round2(students.reduce((s, x) => s + x.totalOwed, 0)),
  };
};

export const setStudentDiscount = async (studentId, { kind, value, reason }) => {
  const student = await Student.findOne({ _id: studentId, isDeleted: false });
  if (!student) throw fail(404, 'Student not found');
  if (kind === 'percent' && value > 100) throw fail(400, 'A percentage discount cannot be over 100%.');
  student.fee_discount = value > 0 ? { kind, value, reason } : undefined;
  await student.save();
  return student.fee_discount ?? null;
};

// ─── Collecting a payment ───────────────────────────────────────────────────

/**
 * Take one payment for one or more students (siblings).
 *
 * - pay_through 'YYYY-MM' (optional): charge every month up to and including
 *   that one first, so families can pay months or a whole year ahead.
 * - invoice_ids (optional): only pay these invoices (e.g. "mark this month paid").
 * - amount may be less than what is owed (a partial payment): it is applied to
 *   the oldest months first and the rest stays owed.
 */
export const collectPayment = async (input, user) => {
  const { student_ids, amount, pay_through, invoice_ids, payment_method, payer_name, payer_phone, reference, note } = input;
  const total = round2(Number(amount));
  if (!(total > 0)) throw fail(400, 'Enter the amount received.');

  const session = await mongoose.startSession();
  await startTransaction(session);
  try {
    const students = await Student.find({ _id: { $in: student_ids }, isDeleted: false }).session(session);
    if (students.length !== student_ids.length) throw fail(404, 'One of the selected students was not found.');

    if (pay_through) {
      const from = currentPeriod();
      if (pay_through < from) throw fail(400, 'Pay-through month cannot be in the past.');
      for (const s of students) {
        for (const p of periodsBetween(from, pay_through)) await chargeStudentMonth(s, p, session);
      }
    }

    const order = new Map(student_ids.map((id, i) => [String(id), i]));
    const owed = (await StudentInvoice.find({
      student: { $in: student_ids },
      status: { $ne: 'Paid' },
      ...(invoice_ids?.length ? { _id: { $in: invoice_ids } } : {}),
    }).populate({ path: 'fee_struc_no', populate: { path: 'fee_type_no', select: 'fee_name' } }).session(session))
      // Oldest month first; within a month, in the order the students were picked.
      .sort((a, b) => owedOrder(a, b) || order.get(String(a.student)) - order.get(String(b.student)));

    const totalOwed = round2(owed.reduce((s, i) => s + i.balance, 0));
    if (total > totalOwed + 0.001) {
      throw fail(400, totalOwed === 0
        ? 'Nothing is owed. To pay ahead, choose the month to pay through.'
        : `That is more than is owed (${totalOwed}). To pay ahead, choose a later "pay through" month.`);
    }

    const receipt_no = await generateFeeNumber();
    const registerBy = user?.name || user?.id || 'system';
    const lines = [];
    let remaining = total;
    for (const inv of owed) {
      if (remaining <= 0) break;
      const pay = round2(Math.min(inv.balance, remaining));
      if (pay <= 0) continue;
      const { fee, invoice } = await applyPaymentToInvoice({
        invoiceId: inv._id,
        amount: pay,
        payment_method_no: payment_method,
        acc_no: reference,
        student_fee_no: `${receipt_no}-${lines.length + 1}`,
        registerBy,
        session,
      });
      lines.push({
        invoice: invoice._id,
        student: invoice.student._id,
        student_fee: fee._id,
        period: invoice.period,
        // e.g. "Monthly Tuition" or "Science & Computer Lab Fee" — what the family recognises.
        description: invoiceLabel(inv),
        amount: pay,
        balance_after: invoice.balance,
      });
      remaining = round2(remaining - pay);
    }

    const [receipt] = await FeeReceipt.create([{
      receipt_no,
      students: student_ids,
      payer_name,
      payer_phone,
      lines,
      total,
      payment_method,
      reference,
      note,
      received_by: user?.id,
      received_by_name: user?.name ?? (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : undefined),
      received_at: new Date(),
    }], { session });

    await commitTransaction(session);
    return getReceipt(receipt._id);
  } catch (err) {
    await abortTransaction(session);
    throw err;
  } finally {
    session.endSession();
  }
};

export const getReceipt = async (id) => {
  const receipt = await FeeReceipt.findById(id)
    .populate('students', 'firstName lastName admissionNumber')
    .populate('lines.student', 'firstName lastName admissionNumber classId')
    .populate('payment_method', 'payment_method_name');
  if (!receipt) throw fail(404, 'Receipt not found');

  const owedNow = await StudentInvoice.aggregate([
    { $match: { student: { $in: receipt.students.map((s) => s._id) }, status: { $ne: 'Paid' } } },
    { $group: { _id: '$student', balance: { $sum: '$balance' } } },
  ]);
  return { ...receipt.toObject(), remainingByStudent: owedNow.map((o) => ({ student: o._id, balance: round2(o.balance) })) };
};

/**
 * Receipts, newest first. `from`/`to` are months ('YYYY-MM', inclusive) and
 * `q` matches the receipt number or the payer's name or phone.
 */
export const listReceipts = async ({ student, from, to, q, limit = 20 } = {}) => {
  const filter = {};
  if (student) {
    if (!mongoose.isValidObjectId(student)) throw fail(400, 'Unknown student.');
    filter.students = student;
  }
  if ((from && !PERIOD_RE.test(from)) || (to && !PERIOD_RE.test(to))) throw fail(400, 'Month must look like 2026-07.');
  if (from || to) {
    filter.received_at = {};
    if (from) filter.received_at.$gte = new Date(`${from}-01T00:00:00`);
    if (to) {
      const [y, m] = to.split('-').map(Number);
      filter.received_at.$lt = new Date(y, m, 1);
    }
  }
  const term = String(q ?? '').trim();
  if (term) {
    const re = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ receipt_no: re }, { payer_name: re }, { payer_phone: re }];
  }
  return FeeReceipt.find(filter)
    .sort({ received_at: -1 })
    .limit(Math.min(Number(limit) || 20, 200))
    .populate('students', 'firstName lastName')
    .populate('payment_method', 'payment_method_name');
};

// ─── Class month view ───────────────────────────────────────────────────────

export const getClassStatus = async (classId, period) => {
  const klass = await Class.findById(classId).select('cl_name');
  if (!klass) throw fail(404, 'Class not found');

  const [fee, students] = await Promise.all([
    monthlyFeeFor(classId),
    Student.find({ classId, isDeleted: false, status: 'Active' }).select('firstName lastName admissionNumber familyId').sort({ firstName: 1, lastName: 1 }),
  ]);
  const ids = students.map((s) => s._id);

  const [monthInvoices, earlier, ahead] = await Promise.all([
    fee ? StudentInvoice.find({ student: { $in: ids }, fee_struc_no: fee._id, period }) : [],
    StudentInvoice.aggregate([
      { $match: { student: { $in: ids }, status: { $ne: 'Paid' }, $or: [{ period: { $lt: period } }, { period: { $exists: false } }] } },
      { $group: { _id: '$student', balance: { $sum: '$balance' } } },
    ]),
    StudentInvoice.aggregate([
      { $match: { student: { $in: ids }, period: { $gt: period }, status: 'Paid' } },
      { $group: { _id: '$student', through: { $max: '$period' } } },
    ]),
  ]);
  const monthByStudent = new Map(monthInvoices.map((i) => [String(i.student), i]));
  const earlierByStudent = new Map(earlier.map((e) => [String(e._id), round2(e.balance)]));
  const aheadByStudent = new Map(ahead.map((a) => [String(a._id), a.through]));

  const rows = students.map((s) => {
    const inv = monthByStudent.get(String(s._id));
    const previous = earlierByStudent.get(String(s._id)) ?? 0;
    return {
      studentId: s._id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      month: inv ? toLine(inv) : null,
      status: inv ? inv.status : 'Not charged',
      previousBalance: previous,
      totalOwed: round2(previous + (inv?.balance ?? 0)),
      paidAheadThrough: aheadByStudent.get(String(s._id)) ?? null,
    };
  });

  const sum = (f) => round2(rows.reduce((s, r) => s + (r.month ? f(r.month) : 0), 0));
  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    class: { _id: klass._id, name: klass.cl_name },
    period,
    monthlyFee: fee?.amount ?? null,
    rows,
    summary: {
      students: rows.length,
      paid: count('Paid'),
      partial: count('Partially_Paid'),
      unpaid: count('Unpaid'),
      notCharged: count('Not charged'),
      charged: sum((m) => m.amount),
      collected: sum((m) => m.paid),
      outstanding: sum((m) => m.balance),
      previousOutstanding: round2(rows.reduce((s, r) => s + r.previousBalance, 0)),
    },
  };
};

// ─── Report ─────────────────────────────────────────────────────────────────

export const getReport = async ({ from, to, level_id, class_id }) => {
  const match = { period: { $gte: from, $lte: to } };
  if (class_id) {
    match.class_id = new mongoose.Types.ObjectId(class_id);
  } else if (level_id) {
    const classIds = await Class.find({ lev_no: level_id }).distinct('_id');
    match.class_id = { $in: classIds };
  }

  const sums = {
    charged: { $sum: { $ifNull: ['$original_amount', '$invoice_amount'] } },
    discount: { $sum: { $ifNull: ['$discount_amount', 0] } },
    net: { $sum: '$invoice_amount' },
    collected: { $sum: '$paid_amount' },
    outstanding: { $sum: '$balance' },
    paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
    partial: { $sum: { $cond: [{ $eq: ['$status', 'Partially_Paid'] }, 1, 0] } },
    unpaid: { $sum: { $cond: [{ $eq: ['$status', 'Unpaid'] }, 1, 0] } },
  };

  const [byClass, byMonth, byStudent] = await Promise.all([
    StudentInvoice.aggregate([
      { $match: match },
      { $group: { _id: '$class_id', ...sums, students: { $addToSet: '$student' } } },
      { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'class' } },
      { $project: { _id: 1, name: { $ifNull: [{ $arrayElemAt: ['$class.cl_name', 0] }, 'Unknown class'] }, students: { $size: '$students' }, charged: 1, discount: 1, net: 1, collected: 1, outstanding: 1, paid: 1, partial: 1, unpaid: 1 } },
      { $sort: { name: 1 } },
    ]),
    StudentInvoice.aggregate([
      { $match: match },
      { $group: { _id: '$period', ...sums } },
      { $sort: { _id: 1 } },
    ]),
    StudentInvoice.aggregate([
      { $match: match },
      { $group: { _id: '$student', class_id: { $last: '$class_id' }, ...sums, months: { $sum: 1 } } },
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 's' } },
      { $lookup: { from: 'classes', localField: 'class_id', foreignField: '_id', as: 'c' } },
      { $project: {
        _id: 1, months: 1, charged: 1, discount: 1, net: 1, collected: 1, outstanding: 1, paid: 1, partial: 1, unpaid: 1,
        name: { $concat: [{ $arrayElemAt: ['$s.firstName', 0] }, ' ', { $arrayElemAt: ['$s.lastName', 0] }] },
        admissionNumber: { $arrayElemAt: ['$s.admissionNumber', 0] },
        className: { $ifNull: [{ $arrayElemAt: ['$c.cl_name', 0] }, ''] },
      } },
      { $sort: { outstanding: -1, name: 1 } },
    ]),
  ]);

  const roundRow = (r) => ({ ...r, charged: round2(r.charged), discount: round2(r.discount), net: round2(r.net), collected: round2(r.collected), outstanding: round2(r.outstanding) });
  const totals = byClass.reduce((t, r) => ({
    charged: t.charged + r.charged, discount: t.discount + r.discount, net: t.net + r.net,
    collected: t.collected + r.collected, outstanding: t.outstanding + r.outstanding, students: t.students + r.students,
  }), { charged: 0, discount: 0, net: 0, collected: 0, outstanding: 0, students: 0 });

  return {
    from, to,
    totals: { ...roundRow(totals), collectionRate: totals.net > 0 ? Math.round((totals.collected / totals.net) * 1000) / 10 : 0 },
    byClass: byClass.map(roundRow),
    byMonth: byMonth.map((m) => roundRow({ ...m, period: m._id })),
    byStudent: byStudent.map(roundRow),
  };
};
