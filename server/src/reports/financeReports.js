import StudentInvoice from '../models/StudentInvoice.js';
import StudentFee from '../models/StudentFee.js';
import StudentScholarship from '../models/StudentScholarship.js';
import Refund from '../models/Refund.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import Class from '../models/Class.js';
import {
  FILTERS,
  dateRange,
  fullName,
  money,
  percent,
  round1,
  resolveYearScopedStudentIds,
  resolveHistoricalClassMap
} from './helpers.js';

/**
 * Reports for the finance office.
 *
 * These read the live billing ledger only:
 *   StudentInvoice     — what was billed, paid and still owed
 *   StudentFee         — each payment actually received against an invoice
 *   StudentScholarship — discounts and waivers granted
 *   Refund             — money handed back against a StudentFee payment
 *
 * The legacy `Invoice` and `Payment`/`Receipt` collections are deliberately
 * NOT used: nothing in the app writes to them, so reporting on them would
 * show figures that do not match real invoicing. See also
 * analyticsController.getFinanceDashboardKPIs, which reads the same ledger.
 * "Payment Receipts" below reads `StudentFee` rather than the dead `Receipt`
 * collection for the same reason — every StudentFee now carries a
 * server-generated receipt number (student_fee_no; see generateFeeNumber in
 * studentFeeController.js), so it *is* the receipt.
 */

// Finance data is restricted — teachers and academic officers never see it.
const FINANCE_ROLES = ['admin', 'accountant', 'principal'];

const report = (group, id, title, description, filters, run) => ({
  id,
  title,
  description,
  group,
  department: 'finance',
  roles: FINANCE_ROLES,
  filters,
  run
});

const INVOICE_POPULATE = [
  {
    path: 'student',
    select: 'firstName lastName admissionNumber classId isDeleted',
    populate: { path: 'classId', select: 'cl_name' }
  },
  {
    path: 'fee_struc_no',
    select: 'fee_struc_no amount fee_type_no y_no lev_no',
    populate: [
      { path: 'fee_type_no', select: 'fee_name fee_type_no' },
      { path: 'y_no', select: 'y_name' },
      { path: 'lev_no', select: 'lev_name' }
    ]
  }
];

/**
 * Student ids for a class filter — scoped to a specific academic year via
 * the StudentClass enrolment ledger when filters.year_id is given, so
 * "Class 5, 2025" means whoever was actually in Class 5 in 2025, not
 * whoever happens to be in Class 5 today. Falls back to each student's
 * current class when no year is selected — the right meaning for "who is
 * in Class 5" with no year in play. See resolveHistoricalRoster in
 * helpers.js for why this can't just be Student.classId unconditionally.
 */
const studentIdsForClass = async (filters = {}) => {
  if (!filters.class_id) return null;
  const scoped = await resolveYearScopedStudentIds(filters);
  if (scoped) return scoped;
  const students = await Student.find({ classId: filters.class_id }).select('_id');
  return students.map((s) => String(s._id));
};

/**
 * class_id / year_id / fee_type_id all live on refs one or two hops away from
 * StudentInvoice (student.classId, fee_struc_no.y_no, fee_struc_no.fee_type_no),
 * so they can't be a direct Mongo `$match` on the invoice collection itself.
 * Resolving each filter to a set of ids up front — student ids for a class,
 * fee-structure ids for a year/fee-type — lets the actual invoice/payment
 * query run as an indexed `$in` lookup in the database, rather than pulling
 * every document across the wire and filtering in application code. This is
 * the same result a `$lookup` + `$match` aggregation would give; resolving it
 * this way keeps every report's row-shaping code working against the same
 * `.populate()`d Mongoose documents it already expects.
 */
const resolveInvoiceIdFilter = async (filters = {}) => {
  const query = {};

  const studentIds = await studentIdsForClass(filters);
  if (studentIds) query.student = { $in: studentIds };

  if (filters.year_id || filters.fee_type_id) {
    const structureQuery = {};
    if (filters.year_id) structureQuery.y_no = filters.year_id;
    if (filters.fee_type_id) structureQuery.fee_type_no = filters.fee_type_id;
    const structures = await FeeStructure.find(structureQuery).select('_id');
    query.fee_struc_no = { $in: structures.map((s) => s._id) };
  }

  return query;
};

/** Invoices matching the finance filters, fully populated for reporting. */
const findInvoices = async (filters = {}, extra = {}) => {
  const range = dateRange(filters);
  const query = {
    ...extra,
    ...(await resolveInvoiceIdFilter(filters)),
    ...(range ? { registerDate: range } : {})
  };

  return StudentInvoice.find(query).populate(INVOICE_POPULATE).sort({ registerDate: -1 });
};

/** Payments received, with the invoice and student they belong to. */
const findPayments = async (filters = {}) => {
  const range = dateRange(filters);
  const query = { ...(range ? { registerDate: range } : {}) };

  // payment_method_id is a direct field on StudentFee — no lookup needed.
  if (filters.payment_method_id) query.payment_method_no = filters.payment_method_id;

  // class_id reaches StudentFee via invoice_no.student.classId, two hops away —
  // resolve the matching invoice ids first so the query stays indexed.
  const studentIds = await studentIdsForClass(filters);
  if (studentIds) {
    const invoices = await StudentInvoice.find({ student: { $in: studentIds } }).select('_id');
    query.invoice_no = { $in: invoices.map((i) => i._id) };
  }

  return StudentFee.find(query)
    .populate({ path: 'invoice_no', select: 'invoice_no student fee_struc_no', populate: INVOICE_POPULATE })
    .populate('payment_method_no', 'payment_method_name')
    .sort({ registerDate: -1 });
};

/** Refunds issued, with the same class_id resolution as findPayments. */
const findRefunds = async (filters = {}) => {
  const range = dateRange(filters);
  const query = { ...(range ? { refundDate: range } : {}) };

  const studentIds = await studentIdsForClass(filters);
  if (studentIds) query.student = { $in: studentIds };

  return Refund.find(query)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNumber classId',
      populate: { path: 'classId', select: 'cl_name' }
    })
    .populate({ path: 'invoice_no', select: 'invoice_no' })
    .populate({ path: 'student_fee_no', select: 'student_fee_no' })
    .populate({ path: 'authorisedBy', select: 'username firstName lastName' })
    .sort({ refundDate: -1 });
};

const invoiceTotals = (invoices) => {
  const expected = invoices.reduce((sum, i) => sum + (i.invoice_amount ?? 0), 0);
  const collected = invoices.reduce((sum, i) => sum + (i.paid_amount ?? 0), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.balance ?? 0), 0);
  return {
    expected: money(expected),
    collected: money(collected),
    outstanding: money(outstanding),
    collectionRate: percent(collected, expected)
  };
};

const financialSummary = (invoices) => {
  const totals = invoiceTotals(invoices);
  return [
    { label: 'Expected Revenue', value: totals.expected },
    { label: 'Collected Revenue', value: totals.collected },
    { label: 'Outstanding Revenue', value: totals.outstanding },
    { label: 'Collection Rate', value: `${totals.collectionRate}%` }
  ];
};

/**
 * Row shape shared by every invoice-per-student report (fully paid /
 * partially paid / unpaid / discounts). Pass historicalClassByStudent
 * (from resolveHistoricalClassMap) when a year filter is in play, so the
 * "Class" column shows the class the student was in *during that year*
 * rather than their current class.
 */
const studentRow = (invoice, historicalClassByStudent = null) => {
  const displayClass = historicalClassByStudent
    ? historicalClassByStudent.get(String(invoice.student?._id))
    : invoice.student?.classId;
  return {
    invoiceNo: invoice.invoice_no,
    rollNo: invoice.student?.admissionNumber ?? '—',
    name: fullName(invoice.student),
    className: displayClass?.cl_name ?? '—',
    feeType: invoice.fee_struc_no?.fee_type_no?.fee_name ?? '—',
    invoiced: money(invoice.invoice_amount),
    paid: money(invoice.paid_amount),
    balance: money(invoice.balance),
    status: invoice.status,
    dueDate: invoice.dueDate ?? null
  };
};

const STUDENT_INVOICE_COLUMNS = [
  { key: 'rollNo', label: 'Admission No' },
  { key: 'name', label: 'Student' },
  { key: 'className', label: 'Class' },
  { key: 'feeType', label: 'Fee Type' },
  { key: 'invoiced', label: 'Invoiced', type: 'money' },
  { key: 'paid', label: 'Paid', type: 'money' },
  { key: 'balance', label: 'Balance', type: 'money' },
  { key: 'dueDate', label: 'Due', type: 'date' }
];

// ============================================================
// Fee Collection
// ============================================================

const feeCollectionReports = [
  report(
    'Fee Collection',
    'finance-collection-summary',
    'Fee Collection Summary',
    'Expected, collected and outstanding fees broken down by fee type',
    [FILTERS.year, FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const invoices = await findInvoices(filters);

      const byType = new Map();
      for (const invoice of invoices) {
        const key = invoice.fee_struc_no?.fee_type_no?.fee_name ?? 'Unclassified';
        if (!byType.has(key)) {
          byType.set(key, { feeType: key, invoices: 0, expected: 0, collected: 0, outstanding: 0 });
        }
        const entry = byType.get(key);
        entry.invoices += 1;
        entry.expected += invoice.invoice_amount ?? 0;
        entry.collected += invoice.paid_amount ?? 0;
        entry.outstanding += invoice.balance ?? 0;
      }

      const rows = Array.from(byType.values())
        .map((entry) => ({
          feeType: entry.feeType,
          invoices: entry.invoices,
          expected: money(entry.expected),
          collected: money(entry.collected),
          outstanding: money(entry.outstanding),
          collectionRate: percent(entry.collected, entry.expected)
        }))
        .sort((a, b) => b.expected - a.expected);

      return {
        columns: [
          { key: 'feeType', label: 'Fee Type' },
          { key: 'invoices', label: 'Invoices', type: 'number' },
          { key: 'expected', label: 'Expected', type: 'money' },
          { key: 'collected', label: 'Collected', type: 'money' },
          { key: 'outstanding', label: 'Outstanding', type: 'money' },
          { key: 'collectionRate', label: 'Collection Rate %', type: 'number' }
        ],
        rows,
        summary: financialSummary(invoices),
        chart: { type: 'bar', x: 'feeType', series: ['expected', 'collected'] }
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-fully-paid',
    'Fully Paid Students',
    'Students whose invoices are settled in full',
    [FILTERS.class, FILTERS.year, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters, { status: 'Paid' }),
        resolveHistoricalClassMap(filters)
      ]);
      return {
        columns: STUDENT_INVOICE_COLUMNS.filter((c) => c.key !== 'balance'),
        rows: invoices.map((invoice) => studentRow(invoice, historicalClassByStudent)),
        summary: [
          { label: 'Paid Invoices', value: invoices.length },
          { label: 'Students', value: new Set(invoices.map((i) => String(i.student?._id))).size },
          { label: 'Amount Collected', value: money(invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0)) }
        ]
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-partially-paid',
    'Partially Paid Students',
    'Invoices with some payment received but a balance still outstanding',
    [FILTERS.class, FILTERS.year, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters, { status: 'Partially_Paid' }),
        resolveHistoricalClassMap(filters)
      ]);
      const rows = invoices
        .map((invoice) => ({
          ...studentRow(invoice, historicalClassByStudent),
          paidPercent: percent(invoice.paid_amount, invoice.invoice_amount)
        }))
        .sort((a, b) => b.balance - a.balance);

      return {
        columns: [...STUDENT_INVOICE_COLUMNS, { key: 'paidPercent', label: 'Paid %', type: 'number' }],
        rows,
        summary: [
          { label: 'Partially Paid', value: invoices.length },
          { label: 'Collected So Far', value: money(invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0)) },
          { label: 'Still Outstanding', value: money(invoices.reduce((s, i) => s + (i.balance ?? 0), 0)) }
        ]
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-unpaid',
    'Unpaid Students',
    'Invoices with no payment received at all',
    [FILTERS.class, FILTERS.year, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters, { status: 'Unpaid' }),
        resolveHistoricalClassMap(filters)
      ]);
      const now = Date.now();
      const rows = invoices
        .map((invoice) => ({
          ...studentRow(invoice, historicalClassByStudent),
          overdue: invoice.dueDate && new Date(invoice.dueDate).getTime() < now ? 'Yes' : 'No'
        }))
        .sort((a, b) => b.balance - a.balance);

      return {
        columns: [...STUDENT_INVOICE_COLUMNS, { key: 'overdue', label: 'Overdue' }],
        rows,
        summary: [
          { label: 'Unpaid Invoices', value: invoices.length },
          { label: 'Students', value: new Set(invoices.map((i) => String(i.student?._id))).size },
          { label: 'Amount Unpaid', value: money(invoices.reduce((s, i) => s + (i.balance ?? 0), 0)) },
          { label: 'Overdue', value: rows.filter((r) => r.overdue === 'Yes').length }
        ]
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-collection-by-class',
    'Collection by Class',
    'What each class was billed, has paid and still owes',
    [FILTERS.year, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, classes, historicalClassByStudent] = await Promise.all([
        findInvoices(filters),
        Class.find(),
        resolveHistoricalClassMap(filters)
      ]);

      const byClass = new Map();
      for (const klass of classes) {
        byClass.set(String(klass._id), {
          className: klass.cl_name,
          students: new Set(),
          expected: 0,
          collected: 0,
          outstanding: 0
        });
      }

      for (const invoice of invoices) {
        // Bucket by the class the student was in *during the selected year*
        // when one is given, not whatever class they're in today.
        const studentClass = historicalClassByStudent
          ? historicalClassByStudent.get(String(invoice.student?._id))
          : invoice.student?.classId;
        const key = String(studentClass?._id ?? 'unknown');
        if (!byClass.has(key)) {
          byClass.set(key, {
            className: studentClass?.cl_name ?? 'Unassigned',
            students: new Set(),
            expected: 0,
            collected: 0,
            outstanding: 0
          });
        }
        const entry = byClass.get(key);
        if (invoice.student?._id) entry.students.add(String(invoice.student._id));
        entry.expected += invoice.invoice_amount ?? 0;
        entry.collected += invoice.paid_amount ?? 0;
        entry.outstanding += invoice.balance ?? 0;
      }

      const rows = Array.from(byClass.values())
        // Classes with nothing billed would otherwise pad the table with zeros.
        .filter((entry) => entry.expected > 0)
        .map((entry) => ({
          className: entry.className,
          students: entry.students.size,
          expected: money(entry.expected),
          collected: money(entry.collected),
          outstanding: money(entry.outstanding),
          collectionRate: percent(entry.collected, entry.expected)
        }))
        .sort((a, b) => b.outstanding - a.outstanding);

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'students', label: 'Students Billed', type: 'number' },
          { key: 'expected', label: 'Expected', type: 'money' },
          { key: 'collected', label: 'Collected', type: 'money' },
          { key: 'outstanding', label: 'Outstanding', type: 'money' },
          { key: 'collectionRate', label: 'Collection Rate %', type: 'number' }
        ],
        rows,
        summary: financialSummary(invoices),
        chart: { type: 'bar', x: 'className', series: ['collected', 'outstanding'] }
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-collection-by-year',
    'Collection by Academic Year',
    'Billing and collection totals for each academic year',
    [FILTERS.class],
    async (filters) => {
      const invoices = await findInvoices(filters);

      const byYear = new Map();
      for (const invoice of invoices) {
        const key = invoice.fee_struc_no?.y_no?.y_name ?? 'Unassigned';
        if (!byYear.has(key)) {
          byYear.set(key, { year: key, invoices: 0, expected: 0, collected: 0, outstanding: 0 });
        }
        const entry = byYear.get(key);
        entry.invoices += 1;
        entry.expected += invoice.invoice_amount ?? 0;
        entry.collected += invoice.paid_amount ?? 0;
        entry.outstanding += invoice.balance ?? 0;
      }

      const rows = Array.from(byYear.values())
        .map((entry) => ({
          year: entry.year,
          invoices: entry.invoices,
          expected: money(entry.expected),
          collected: money(entry.collected),
          outstanding: money(entry.outstanding),
          collectionRate: percent(entry.collected, entry.expected)
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

      return {
        columns: [
          { key: 'year', label: 'Academic Year' },
          { key: 'invoices', label: 'Invoices', type: 'number' },
          { key: 'expected', label: 'Expected', type: 'money' },
          { key: 'collected', label: 'Collected', type: 'money' },
          { key: 'outstanding', label: 'Outstanding', type: 'money' },
          { key: 'collectionRate', label: 'Collection Rate %', type: 'number' }
        ],
        rows,
        summary: financialSummary(invoices),
        chart: { type: 'bar', x: 'year', series: ['expected', 'collected'] }
      };
    }
  ),

  report(
    'Fee Collection',
    'finance-collection-by-period',
    'Collection by Payment Period',
    'Money actually received in each month, with how many payments made it up',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const payments = await findPayments(filters);

      const byMonth = new Map();
      for (const payment of payments) {
        const key = new Date(payment.registerDate).toISOString().slice(0, 7);
        if (!byMonth.has(key)) byMonth.set(key, { period: key, payments: 0, collected: 0, students: new Set() });
        const entry = byMonth.get(key);
        entry.payments += 1;
        entry.collected += payment.paid_amount ?? 0;
        const studentId = payment.invoice_no?.student?._id;
        if (studentId) entry.students.add(String(studentId));
      }

      const rows = Array.from(byMonth.values())
        .map((entry) => ({
          period: entry.period,
          payments: entry.payments,
          students: entry.students.size,
          collected: money(entry.collected)
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        columns: [
          { key: 'period', label: 'Period' },
          { key: 'payments', label: 'Payments', type: 'number' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'collected', label: 'Collected', type: 'money' }
        ],
        rows,
        summary: [
          { label: 'Periods', value: rows.length },
          { label: 'Total Collected', value: money(payments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)) }
        ],
        chart: { type: 'bar', x: 'period', series: ['collected'] }
      };
    }
  )
];

// ============================================================
// Payment Reports
// ============================================================

const paymentRow = (payment) => {
  const invoice = payment.invoice_no;
  return {
    reference: payment.student_fee_no,
    date: payment.registerDate,
    rollNo: invoice?.student?.admissionNumber ?? '—',
    name: fullName(invoice?.student),
    className: invoice?.student?.classId?.cl_name ?? '—',
    invoiceNo: invoice?.invoice_no ?? '—',
    method: payment.payment_method_no?.payment_method_name ?? '—',
    amount: money(payment.paid_amount),
    account: payment.acc_no ?? '—',
    recordedBy: payment.registerBy ?? '—'
  };
};

const PAYMENT_COLUMNS = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'reference', label: 'Reference' },
  { key: 'rollNo', label: 'Admission No' },
  { key: 'name', label: 'Student' },
  { key: 'className', label: 'Class' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', type: 'money' }
];

/** Roll payments up into calendar buckets for the daily/weekly/monthly views. */
const bucketPayments = (payments, keyOf, label) => {
  const buckets = new Map();
  for (const payment of payments) {
    const key = keyOf(new Date(payment.registerDate));
    if (!buckets.has(key)) buckets.set(key, { period: key, payments: 0, students: new Set(), collected: 0 });
    const entry = buckets.get(key);
    entry.payments += 1;
    entry.collected += payment.paid_amount ?? 0;
    const studentId = payment.invoice_no?.student?._id;
    if (studentId) entry.students.add(String(studentId));
  }

  const rows = Array.from(buckets.values())
    .map((entry) => ({
      period: entry.period,
      payments: entry.payments,
      students: entry.students.size,
      collected: money(entry.collected)
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const total = payments.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0);

  return {
    columns: [
      { key: 'period', label: label },
      { key: 'payments', label: 'Payments', type: 'number' },
      { key: 'students', label: 'Students', type: 'number' },
      { key: 'collected', label: 'Collected', type: 'money' }
    ],
    rows,
    summary: [
      { label: 'Total Collected', value: money(total) },
      { label: 'Payments', value: payments.length },
      { label: `Average per ${label}`, value: rows.length ? money(total / rows.length) : 0 }
    ],
    chart: { type: 'bar', x: 'period', series: ['collected'] }
  };
};

/** ISO week key (YYYY-Www) so weeks sort correctly across a year boundary. */
const isoWeekKey = (date) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const paymentReports = [
  report(
    'Payments',
    'finance-payments-daily',
    'Daily Payments',
    'Money received each day',
    [FILTERS.class, FILTERS.paymentMethod, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) =>
      bucketPayments(await findPayments(filters), (d) => d.toISOString().slice(0, 10), 'Day')
  ),

  report(
    'Payments',
    'finance-payments-weekly',
    'Weekly Payments',
    'Money received each week',
    [FILTERS.class, FILTERS.paymentMethod, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => bucketPayments(await findPayments(filters), isoWeekKey, 'Week')
  ),

  report(
    'Payments',
    'finance-payments-monthly',
    'Monthly Payments',
    'Money received each month',
    [FILTERS.class, FILTERS.paymentMethod, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) =>
      bucketPayments(await findPayments(filters), (d) => d.toISOString().slice(0, 7), 'Month')
  ),

  report(
    'Payments',
    'finance-payment-history',
    'Payment History',
    'Every payment received, newest first',
    [FILTERS.class, FILTERS.paymentMethod, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const payments = await findPayments(filters);
      const byMethod = payments.reduce((acc, p) => {
        const name = p.payment_method_no?.payment_method_name ?? 'Unknown';
        acc[name] = money((acc[name] ?? 0) + (p.paid_amount ?? 0));
        return acc;
      }, {});

      return {
        columns: [...PAYMENT_COLUMNS, { key: 'invoiceNo', label: 'Invoice' }],
        rows: payments.map(paymentRow),
        summary: [
          { label: 'Payments', value: payments.length },
          { label: 'Total Collected', value: money(payments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)) },
          ...Object.entries(byMethod).map(([label, value]) => ({ label, value }))
        ]
      };
    }
  ),

  report(
    'Payments',
    'finance-receipts',
    'Payment Receipts',
    'Receipt reference, payer and amount for every payment recorded',
    [FILTERS.class, FILTERS.paymentMethod, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const payments = await findPayments(filters);
      return {
        columns: [
          { key: 'reference', label: 'Receipt Ref' },
          { key: 'date', label: 'Issued', type: 'date' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'invoiceNo', label: 'Invoice' },
          { key: 'method', label: 'Method' },
          { key: 'account', label: 'Account' },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'recordedBy', label: 'Recorded By' }
        ],
        rows: payments.map(paymentRow),
        summary: [
          { label: 'Receipts', value: payments.length },
          { label: 'Total Receipted', value: money(payments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)) }
        ]
      };
    }
  ),

  report(
    'Payments',
    'finance-refunds',
    'Refunds',
    'Money refunded against a payment, with who authorised it and why',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const refunds = await findRefunds(filters);

      const rows = refunds.map((r) => ({
        refundNo: r.refund_no,
        date: r.refundDate,
        rollNo: r.student?.admissionNumber ?? '—',
        name: fullName(r.student),
        className: r.student?.classId?.cl_name ?? '—',
        invoiceNo: r.invoice_no?.invoice_no ?? '—',
        paymentRef: r.student_fee_no?.student_fee_no ?? '—',
        amount: money(r.amount),
        reason: r.reason,
        authorisedBy:
          fullName({ firstName: r.authorisedBy?.firstName, lastName: r.authorisedBy?.lastName }) ||
          r.authorisedBy?.username ||
          '—',
        status: r.status
      }));

      const issued = refunds.filter((r) => r.status === 'issued');

      return {
        columns: [
          { key: 'refundNo', label: 'Refund No' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'invoiceNo', label: 'Invoice' },
          { key: 'paymentRef', label: 'Payment Ref' },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'reason', label: 'Reason' },
          { key: 'authorisedBy', label: 'Authorised By' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Refunds Issued', value: issued.length },
          { label: 'Total Refunded', value: money(issued.reduce((s, r) => s + r.amount, 0)) },
          { label: 'Reversed', value: refunds.filter((r) => r.status === 'reversed').length }
        ]
      };
    }
  ),

  report(
    'Payments',
    'finance-discounts',
    'Discounts Applied',
    'Invoices carrying a sibling or scholarship discount, and what it cost',
    [FILTERS.class, FILTERS.year, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters),
        resolveHistoricalClassMap(filters)
      ]);
      const discounted = invoices.filter((i) => (i.discount_amount ?? 0) > 0);

      const rows = discounted
        .map((invoice) => {
          const displayClass = historicalClassByStudent
            ? historicalClassByStudent.get(String(invoice.student?._id))
            : invoice.student?.classId;
          return {
            invoiceNo: invoice.invoice_no,
            rollNo: invoice.student?.admissionNumber ?? '—',
            name: fullName(invoice.student),
            className: displayClass?.cl_name ?? '—',
            feeType: invoice.fee_struc_no?.fee_type_no?.fee_name ?? '—',
            original: money(invoice.original_amount ?? invoice.invoice_amount + (invoice.discount_amount ?? 0)),
            discountPercent: round1(invoice.discount_percentage ?? 0),
            discount: money(invoice.discount_amount),
            billed: money(invoice.invoice_amount)
          };
        })
        .sort((a, b) => b.discount - a.discount);

      const totalDiscount = discounted.reduce((s, i) => s + (i.discount_amount ?? 0), 0);
      const totalOriginal = discounted.reduce(
        (s, i) => s + (i.original_amount ?? i.invoice_amount + (i.discount_amount ?? 0)),
        0
      );

      return {
        columns: [
          { key: 'invoiceNo', label: 'Invoice' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'feeType', label: 'Fee Type' },
          { key: 'original', label: 'Before Discount', type: 'money' },
          { key: 'discountPercent', label: 'Discount %', type: 'number' },
          { key: 'discount', label: 'Discount', type: 'money' },
          { key: 'billed', label: 'Billed', type: 'money' }
        ],
        rows,
        summary: [
          { label: 'Discounted Invoices', value: discounted.length },
          { label: 'Total Discount Given', value: money(totalDiscount) },
          { label: 'Share of Original Billing', value: `${percent(totalDiscount, totalOriginal)}%` }
        ]
      };
    }
  ),

  report(
    'Payments',
    'finance-waivers',
    'Waivers & Scholarships',
    'Scholarships and sibling waivers granted, with their period of validity',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const range = dateRange(filters);
      const grants = await StudentScholarship.find(range ? { startDate: range } : {})
        .populate({
          path: 'st_no',
          select: 'firstName lastName admissionNumber classId',
          populate: { path: 'classId', select: 'cl_name' }
        })
        .populate({
          path: 'scholarship_id',
          select: 'discount_value description scholar_type_no discount_type_id',
          populate: [
            { path: 'scholar_type_no', select: 'scholarship_name' },
            { path: 'discount_type_id', select: 'discount_type_name' }
          ]
        })
        .populate({ path: 'rule_id', select: 'rule_name discount_percentage' })
        .populate({ path: 'status_no', select: 'st_name' })
        .sort({ startDate: -1 });

      const rows = grants
        .filter((grant) => !filters.class_id || String(grant.st_no?.classId?._id) === String(filters.class_id))
        .map((grant) => {
          const scholarship = grant.scholarship_id;
          const discountType = scholarship?.discount_type_id?.discount_type_name ?? '—';
          const value = scholarship?.discount_value ?? null;
          return {
            rollNo: grant.st_no?.admissionNumber ?? '—',
            name: fullName(grant.st_no),
            className: grant.st_no?.classId?.cl_name ?? '—',
            // A sibling rule grant has no Scholarship record — label it as such
            // rather than showing an empty row.
            kind: scholarship
              ? scholarship.scholar_type_no?.scholarship_name ?? 'Scholarship'
              : grant.rule_id
              ? 'Sibling Rule'
              : '—',
            discountType,
            value: value ?? grant.rule_id?.discount_percentage ?? null,
            startDate: grant.startDate,
            endDate: grant.endDate,
            status: grant.status_no?.st_name ?? '—'
          };
        });

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'kind', label: 'Type' },
          { key: 'discountType', label: 'Discount Basis' },
          { key: 'value', label: 'Value', type: 'number' },
          { key: 'startDate', label: 'From', type: 'date' },
          { key: 'endDate', label: 'To', type: 'date' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Grants', value: rows.length },
          { label: 'Students', value: new Set(rows.map((r) => r.rollNo)).size }
        ]
      };
    }
  )
];

// ============================================================
// Outstanding Balances
// ============================================================

const outstandingReports = [
  report(
    'Outstanding Balances',
    'finance-outstanding-students',
    'Students with Outstanding Balances',
    'Every student who still owes money, and how much',
    [FILTERS.class, FILTERS.year],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters, { balance: { $gt: 0 } }),
        resolveHistoricalClassMap(filters)
      ]);

      // One row per student, not per invoice — finance chases the person.
      const byStudent = new Map();
      for (const invoice of invoices) {
        const key = String(invoice.student?._id ?? 'unknown');
        if (!byStudent.has(key)) {
          const displayClass = historicalClassByStudent
            ? historicalClassByStudent.get(String(invoice.student?._id))
            : invoice.student?.classId;
          byStudent.set(key, {
            rollNo: invoice.student?.admissionNumber ?? '—',
            name: fullName(invoice.student),
            className: displayClass?.cl_name ?? '—',
            invoices: 0,
            invoiced: 0,
            paid: 0,
            balance: 0,
            oldestDue: null
          });
        }
        const entry = byStudent.get(key);
        entry.invoices += 1;
        entry.invoiced += invoice.invoice_amount ?? 0;
        entry.paid += invoice.paid_amount ?? 0;
        entry.balance += invoice.balance ?? 0;
        if (invoice.dueDate && (!entry.oldestDue || new Date(invoice.dueDate) < new Date(entry.oldestDue))) {
          entry.oldestDue = invoice.dueDate;
        }
      }

      const rows = Array.from(byStudent.values())
        .map((entry) => ({
          ...entry,
          invoiced: money(entry.invoiced),
          paid: money(entry.paid),
          balance: money(entry.balance)
        }))
        .sort((a, b) => b.balance - a.balance);

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'invoices', label: 'Open Invoices', type: 'number' },
          { key: 'invoiced', label: 'Invoiced', type: 'money' },
          { key: 'paid', label: 'Paid', type: 'money' },
          { key: 'balance', label: 'Outstanding', type: 'money' },
          { key: 'oldestDue', label: 'Oldest Due', type: 'date' }
        ],
        rows,
        summary: [
          { label: 'Students Owing', value: rows.length },
          { label: 'Total Outstanding', value: money(rows.reduce((s, r) => s + r.balance, 0)) },
          { label: 'Largest Balance', value: rows[0]?.balance ?? 0 }
        ]
      };
    }
  ),

  report(
    'Outstanding Balances',
    'finance-outstanding-by-class',
    'Outstanding by Class',
    'Where the unpaid money sits across the school',
    [FILTERS.year],
    async (filters) => {
      const [invoices, historicalClassByStudent] = await Promise.all([
        findInvoices(filters, { balance: { $gt: 0 } }),
        resolveHistoricalClassMap(filters)
      ]);

      const byClass = new Map();
      for (const invoice of invoices) {
        // Bucket by the class the student was in *during the selected year*
        // when one is given, not whatever class they're in today.
        const studentClass = historicalClassByStudent
          ? historicalClassByStudent.get(String(invoice.student?._id))
          : invoice.student?.classId;
        const key = studentClass?.cl_name ?? 'Unassigned';
        if (!byClass.has(key)) {
          byClass.set(key, { className: key, students: new Set(), invoices: 0, balance: 0 });
        }
        const entry = byClass.get(key);
        if (invoice.student?._id) entry.students.add(String(invoice.student._id));
        entry.invoices += 1;
        entry.balance += invoice.balance ?? 0;
      }

      const totalBalance = invoices.reduce((s, i) => s + (i.balance ?? 0), 0);

      const rows = Array.from(byClass.values())
        .map((entry) => ({
          className: entry.className,
          students: entry.students.size,
          invoices: entry.invoices,
          balance: money(entry.balance),
          share: percent(entry.balance, totalBalance)
        }))
        .sort((a, b) => b.balance - a.balance);

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'students', label: 'Students Owing', type: 'number' },
          { key: 'invoices', label: 'Open Invoices', type: 'number' },
          { key: 'balance', label: 'Outstanding', type: 'money' },
          { key: 'share', label: 'Share of Total %', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Total Outstanding', value: money(totalBalance) }],
        chart: { type: 'bar', x: 'className', series: ['balance'] }
      };
    }
  ),

  report(
    'Outstanding Balances',
    'finance-aging',
    'Aging of Unpaid Balances',
    'How overdue the outstanding money is, bucketed by days past due',
    [FILTERS.class, FILTERS.year],
    async (filters) => {
      const invoices = await findInvoices(filters, { balance: { $gt: 0 } });
      const now = Date.now();

      // Standard aging buckets; invoices with no due date can't be aged.
      const BUCKETS = [
        { label: 'Not yet due', test: (days) => days !== null && days < 0 },
        { label: '0-30 days', test: (days) => days !== null && days >= 0 && days <= 30 },
        { label: '31-60 days', test: (days) => days !== null && days > 30 && days <= 60 },
        { label: '61-90 days', test: (days) => days !== null && days > 60 && days <= 90 },
        { label: 'Over 90 days', test: (days) => days !== null && days > 90 },
        { label: 'No due date', test: (days) => days === null }
      ];

      const tally = new Map(BUCKETS.map((b) => [b.label, { bucket: b.label, invoices: 0, students: new Set(), balance: 0 }]));

      for (const invoice of invoices) {
        const daysOverdue = invoice.dueDate
          ? Math.floor((now - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000))
          : null;
        const bucket = BUCKETS.find((b) => b.test(daysOverdue));
        if (!bucket) continue;
        const entry = tally.get(bucket.label);
        entry.invoices += 1;
        entry.balance += invoice.balance ?? 0;
        if (invoice.student?._id) entry.students.add(String(invoice.student._id));
      }

      const totalBalance = invoices.reduce((s, i) => s + (i.balance ?? 0), 0);

      const rows = BUCKETS.map((b) => {
        const entry = tally.get(b.label);
        return {
          bucket: b.label,
          invoices: entry.invoices,
          students: entry.students.size,
          balance: money(entry.balance),
          share: percent(entry.balance, totalBalance)
        };
      }).filter((row) => row.invoices > 0);

      const overNinety = tally.get('Over 90 days').balance;

      return {
        columns: [
          { key: 'bucket', label: 'Age' },
          { key: 'invoices', label: 'Invoices', type: 'number' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'balance', label: 'Outstanding', type: 'money' },
          { key: 'share', label: 'Share %', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Total Outstanding', value: money(totalBalance) },
          { label: 'Over 90 Days', value: money(overNinety) },
          { label: 'At Risk', value: `${percent(overNinety, totalBalance)}%` }
        ],
        chart: { type: 'bar', x: 'bucket', series: ['balance'] }
      };
    }
  )
];

// ============================================================
// Financial Summary
// ============================================================

const summaryReports = [
  report(
    'Financial Summary',
    'finance-dashboard',
    'Financial Summary',
    'Expected, collected and outstanding revenue with the overall collection rate',
    [FILTERS.year, FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [invoices, payments, refunds] = await Promise.all([
        findInvoices(filters),
        findPayments(filters),
        findRefunds(filters)
      ]);
      const totals = invoiceTotals(invoices);

      const paidCount = invoices.filter((i) => i.status === 'Paid').length;
      const partialCount = invoices.filter((i) => i.status === 'Partially_Paid').length;
      const unpaidCount = invoices.filter((i) => i.status === 'Unpaid').length;
      const discountTotal = invoices.reduce((s, i) => s + (i.discount_amount ?? 0), 0);
      const issuedRefunds = refunds.filter((r) => r.status === 'issued');
      const refundTotal = issuedRefunds.reduce((s, r) => s + r.amount, 0);

      // Rows are the indicator breakdown; the headline figures sit in summary.
      const rows = [
        {
          indicator: 'Expected Revenue',
          amount: totals.expected,
          detail: `${invoices.length} invoice(s) raised`
        },
        {
          indicator: 'Collected Revenue',
          amount: totals.collected,
          detail: `${payments.length} payment(s) received`
        },
        {
          indicator: 'Outstanding Revenue',
          amount: totals.outstanding,
          detail: `${partialCount + unpaidCount} invoice(s) not settled`
        },
        {
          indicator: 'Refunds Issued',
          amount: money(refundTotal),
          detail: `${issuedRefunds.length} refund(s) issued`
        },
        {
          indicator: 'Discounts Granted',
          amount: money(discountTotal),
          detail: `${invoices.filter((i) => (i.discount_amount ?? 0) > 0).length} discounted invoice(s)`
        },
        {
          indicator: 'Fully Paid Invoices',
          amount: paidCount,
          detail: `${percent(paidCount, invoices.length)}% of all invoices`
        },
        {
          indicator: 'Partially Paid Invoices',
          amount: partialCount,
          detail: `${percent(partialCount, invoices.length)}% of all invoices`
        },
        {
          indicator: 'Unpaid Invoices',
          amount: unpaidCount,
          detail: `${percent(unpaidCount, invoices.length)}% of all invoices`
        }
      ];

      return {
        columns: [
          { key: 'indicator', label: 'Indicator' },
          { key: 'amount', label: 'Value', type: 'number' },
          { key: 'detail', label: 'Detail' }
        ],
        rows,
        summary: financialSummary(invoices)
      };
    }
  )
];

export const financeReports = [
  ...feeCollectionReports,
  ...paymentReports,
  ...outstandingReports,
  ...summaryReports
];
