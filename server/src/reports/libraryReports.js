import Book from '../models/Book.js';
import BookIssue from '../models/BookIssue.js';
import BookReturn from '../models/BookReturn.js';
import BookCategory from '../models/BookCategory.js';
import LibraryFine from '../models/LibraryFine.js';
import ReadingSession from '../models/ReadingSession.js';
import { FILTERS, dateRange, fullName, money, percent, round1 } from './helpers.js';

/**
 * Reports for the library — the four groups from §14.2 of the requirements:
 * Inventory & Availability, Borrowing Activity, Overdue & Fines, Library Usage.
 *
 * These read the live library ledger only:
 *   Book              — the catalogue (qty + available_qty per title)
 *   BookIssue         — every borrowing event (issued / returned / overdue)
 *   BookReturn        — the return record for a specific BookIssue
 *   LibraryFine       — money owed for overdue returns, tied to a BookIssue
 *                       (see services/libraryService.js — this is what the
 *                       active /api/library/fines routes read and write)
 *   ReadingSession    — in-library reading (student borrows nothing, just reads)
 *
 * `LibraryFine` is the only fine model in the app — the parallel `LateFine`
 * that used to sit alongside it was removed on 2026-08-19 once a full-repo
 * grep confirmed nothing wrote to it (no client caller, no test, no service).
 */

// Library data is librarian-scoped. Admin/principal get it too (admin
// implicitly via '*', principal because their management view rolls up
// library posture like everything else).
const LIBRARY_ROLES = ['librarian', 'admin', 'principal'];

const report = (group, id, title, description, filters, run) => ({
  id,
  title,
  description,
  group,
  department: 'library',
  roles: LIBRARY_ROLES,
  filters,
  run
});

const BOOK_POPULATE = [
  { path: 'author_id', select: 'author_name' },
  { path: 'cat_id', select: 'cat_name' },
  { path: 'sh_id', select: 'sh_name' }
];

const ISSUE_POPULATE = [
  { path: 'student_id', select: 'firstName lastName admissionNumber classId', populate: { path: 'classId', select: 'cl_name' } },
  {
    path: 'staff_id',
    select: 'stf_no staffNo personId',
    populate: { path: 'personId', select: 'name' }
  },
  { path: 'book_id', select: 'book_name isbn author_id cat_id', populate: BOOK_POPULATE }
];

/**
 * Any borrower is either a student or a staff member, never both.
 * Reports need one label; carry the identifying number too.
 */
const borrowerLabel = (issue) => {
  if (issue.student_id) {
    const name = fullName(issue.student_id);
    return { name: name || 'Unknown student', ref: issue.student_id.admissionNumber ?? '—', kind: 'Student' };
  }
  if (issue.staff_id) {
    return {
      name: issue.staff_id.personId?.name ?? 'Unknown staff',
      ref: issue.staff_id.stf_no ?? issue.staff_id.staffNo ?? '—',
      kind: 'Staff'
    };
  }
  return { name: '—', ref: '—', kind: '—' };
};

const bookLabel = (book) => book?.book_name ?? '—';

/** BookIssue.status is only set on issue/return; overdue is derived from the date. */
const isOverdue = (issue, now = new Date()) => {
  if (issue.status !== 'issued') return false;
  const due = issue.expected_return_date ? new Date(issue.expected_return_date) : null;
  return due !== null && due < now;
};

/** Days between two dates (rounded up), clamped at 0. Used for overdue and loan durations. */
const daysBetween = (later, earlier) => {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

// ============================================================
// Inventory & Availability
// ============================================================

const inventoryReports = [
  report(
    'Inventory & Availability',
    'library-book-inventory',
    'Book Inventory',
    'Every title with its total copies, available copies, and current shelf',
    [FILTERS.bookCategory],
    async (filters) => {
      const query = { isDeleted: { $ne: true } };
      if (filters.category_id) query.cat_id = filters.category_id;

      const books = await Book.find(query).populate(BOOK_POPULATE).sort({ book_name: 1 });

      const rows = books.map((book) => ({
        title: bookLabel(book),
        isbn: book.isbn || '—',
        author: book.author_id?.author_name ?? '—',
        category: book.cat_id?.cat_name ?? '—',
        shelf: book.sh_id?.sh_name ?? '—',
        totalCopies: book.qty,
        available: book.available_qty,
        onLoan: book.qty - book.available_qty
      }));

      const totalCopies = rows.reduce((s, r) => s + r.totalCopies, 0);
      const available = rows.reduce((s, r) => s + r.available, 0);

      return {
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'isbn', label: 'ISBN' },
          { key: 'author', label: 'Author' },
          { key: 'category', label: 'Category' },
          { key: 'shelf', label: 'Shelf' },
          { key: 'totalCopies', label: 'Total', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' },
          { key: 'onLoan', label: 'On Loan', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Titles', value: rows.length },
          { label: 'Total Copies', value: totalCopies },
          { label: 'Available', value: available },
          { label: 'On Loan', value: totalCopies - available },
          { label: 'Availability', value: `${percent(available, totalCopies)}%` }
        ]
      };
    }
  ),

  report(
    'Inventory & Availability',
    'library-books-by-category',
    'Books by Category',
    'How the catalogue breaks down across categories, with availability',
    [],
    async () => {
      const [categories, books] = await Promise.all([
        BookCategory.find().sort({ cat_name: 1 }),
        Book.find({ isDeleted: { $ne: true } }).select('cat_id qty available_qty')
      ]);

      const byCategory = new Map();
      for (const category of categories) {
        byCategory.set(String(category._id), {
          category: category.cat_name,
          titles: 0,
          totalCopies: 0,
          available: 0
        });
      }
      // Books whose category was deleted still count — group them separately
      // rather than silently vanish from the totals.
      byCategory.set('uncategorised', { category: 'Uncategorised', titles: 0, totalCopies: 0, available: 0 });

      for (const book of books) {
        const key = book.cat_id ? String(book.cat_id) : 'uncategorised';
        const entry = byCategory.get(key) ?? byCategory.get('uncategorised');
        entry.titles += 1;
        entry.totalCopies += book.qty;
        entry.available += book.available_qty;
      }

      const rows = Array.from(byCategory.values())
        .filter((row) => row.titles > 0)
        .map((row) => ({
          ...row,
          onLoan: row.totalCopies - row.available,
          availabilityPercent: percent(row.available, row.totalCopies)
        }))
        .sort((a, b) => b.totalCopies - a.totalCopies);

      return {
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'titles', label: 'Titles', type: 'number' },
          { key: 'totalCopies', label: 'Total Copies', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' },
          { key: 'onLoan', label: 'On Loan', type: 'number' },
          { key: 'availabilityPercent', label: 'Availability %', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Categories', value: rows.length }],
        chart: { type: 'bar', x: 'category', series: ['available', 'onLoan'] }
      };
    }
  ),

  report(
    'Inventory & Availability',
    'library-low-stock',
    'Low Stock & Fully Loaned',
    'Titles with no available copies, plus low-stock titles',
    [FILTERS.bookCategory],
    async (filters) => {
      const query = { isDeleted: { $ne: true } };
      if (filters.category_id) query.cat_id = filters.category_id;

      const books = await Book.find(query).populate(BOOK_POPULATE);

      // A title is "fully loaned" when nothing is on the shelf; "low stock"
      // when it has 1 copy left and holds at least 2 in stock (so the
      // library isn't tempted to flag a single-copy title just because
      // that copy is home). Both go in the same table with a status column.
      const flagged = books
        .map((book) => {
          const status = book.available_qty === 0 && book.qty > 0
            ? 'Fully loaned'
            : book.available_qty === 1 && book.qty > 1
            ? 'Low stock'
            : null;
          return status ? { book, status } : null;
        })
        .filter(Boolean);

      const rows = flagged.map(({ book, status }) => ({
        title: bookLabel(book),
        author: book.author_id?.author_name ?? '—',
        category: book.cat_id?.cat_name ?? '—',
        totalCopies: book.qty,
        available: book.available_qty,
        status
      }));

      return {
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'category', label: 'Category' },
          { key: 'totalCopies', label: 'Total', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Flagged Titles', value: rows.length },
          { label: 'Fully Loaned', value: rows.filter((r) => r.status === 'Fully loaned').length },
          { label: 'Low Stock', value: rows.filter((r) => r.status === 'Low stock').length }
        ]
      };
    }
  )
];

// ============================================================
// Borrowing Activity
// ============================================================

const borrowingReports = [
  report(
    'Borrowing Activity',
    'library-borrowings',
    'Borrowing Activity',
    'Every borrowing event, filtered by status and date range',
    [FILTERS.borrowStatus, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const query = {};
      const range = dateRange(filters);
      if (range) query.issue_date = range;

      // 'overdue' is derived, not stored — filter by status='issued' at query
      // time, then narrow after populating.
      const now = new Date();
      if (filters.borrow_status && filters.borrow_status !== 'overdue') {
        query.status = filters.borrow_status;
      } else if (filters.borrow_status === 'overdue') {
        query.status = 'issued';
      }

      const issues = await BookIssue.find(query).populate(ISSUE_POPULATE).sort({ issue_date: -1 });

      const filtered = filters.borrow_status === 'overdue'
        ? issues.filter((i) => isOverdue(i, now))
        : issues;

      const rows = filtered.map((issue) => {
        const borrower = borrowerLabel(issue);
        const overdue = isOverdue(issue, now);
        return {
          issueDate: issue.issue_date,
          book: bookLabel(issue.book_id),
          isbn: issue.book_id?.isbn ?? '—',
          borrower: borrower.name,
          borrowerRef: borrower.ref,
          borrowerKind: borrower.kind,
          expectedReturn: issue.expected_return_date,
          status: overdue ? 'overdue' : issue.status
        };
      });

      const overdueCount = rows.filter((r) => r.status === 'overdue').length;

      return {
        columns: [
          { key: 'issueDate', label: 'Issued', type: 'date' },
          { key: 'book', label: 'Book' },
          { key: 'isbn', label: 'ISBN' },
          { key: 'borrower', label: 'Borrower' },
          { key: 'borrowerRef', label: 'Ref' },
          { key: 'borrowerKind', label: 'Kind' },
          { key: 'expectedReturn', label: 'Due', type: 'date' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Borrowings', value: rows.length },
          { label: 'Currently Out', value: rows.filter((r) => r.status === 'issued').length },
          { label: 'Overdue', value: overdueCount },
          { label: 'Returned', value: rows.filter((r) => r.status === 'returned').length }
        ]
      };
    }
  ),

  report(
    'Borrowing Activity',
    'library-returns',
    'Return Activity',
    'Books returned in the selected period, with the late-days and fine (if any)',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const query = {};
      const range = dateRange(filters);
      if (range) query.return_date = range;

      const returns = await BookReturn.find(query)
        .populate({
          path: 'issue_id',
          populate: ISSUE_POPULATE
        })
        .sort({ return_date: -1 });

      const rows = returns
        .filter((ret) => ret.issue_id) // dangling returns whose issue was deleted
        .map((ret) => {
          const issue = ret.issue_id;
          const borrower = borrowerLabel(issue);
          return {
            returnDate: ret.return_date,
            book: bookLabel(issue.book_id),
            borrower: borrower.name,
            borrowerRef: borrower.ref,
            issueDate: issue.issue_date,
            lateDays: ret.late_days,
            fine: money(ret.fine_amount ?? 0)
          };
        });

      return {
        columns: [
          { key: 'returnDate', label: 'Returned', type: 'date' },
          { key: 'book', label: 'Book' },
          { key: 'borrower', label: 'Borrower' },
          { key: 'borrowerRef', label: 'Ref' },
          { key: 'issueDate', label: 'Issued', type: 'date' },
          { key: 'lateDays', label: 'Days Late', type: 'number' },
          { key: 'fine', label: 'Fine', type: 'money' }
        ],
        rows,
        summary: [
          { label: 'Returns', value: rows.length },
          { label: 'Late Returns', value: rows.filter((r) => r.lateDays > 0).length },
          { label: 'Total Fine', value: money(rows.reduce((s, r) => s + r.fine, 0)) }
        ]
      };
    }
  ),

  report(
    'Borrowing Activity',
    'library-most-borrowed',
    'Most Borrowed Books',
    'The 20 most-borrowed titles across the selected date range',
    [FILTERS.dateFrom, FILTERS.dateTo, FILTERS.bookCategory],
    async (filters) => {
      const match = {};
      const range = dateRange(filters);
      if (range) match.issue_date = range;

      const agg = await BookIssue.aggregate([
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $group: { _id: '$book_id', borrows: { $sum: 1 } } },
        { $sort: { borrows: -1 } },
        { $limit: 20 }
      ]);

      const bookIds = agg.map((row) => row._id);
      const books = await Book.find({ _id: { $in: bookIds } }).populate(BOOK_POPULATE);
      const bookById = new Map(books.map((b) => [String(b._id), b]));

      const rows = agg
        .map((row) => {
          const book = bookById.get(String(row._id));
          if (!book) return null;
          if (filters.category_id && String(book.cat_id?._id ?? book.cat_id) !== String(filters.category_id)) {
            return null;
          }
          return {
            title: bookLabel(book),
            author: book.author_id?.author_name ?? '—',
            category: book.cat_id?.cat_name ?? '—',
            borrows: row.borrows,
            available: book.available_qty,
            totalCopies: book.qty
          };
        })
        .filter(Boolean);

      return {
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'category', label: 'Category' },
          { key: 'borrows', label: 'Borrowings', type: 'number' },
          { key: 'available', label: 'Available', type: 'number' },
          { key: 'totalCopies', label: 'Total', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Titles', value: rows.length }],
        chart: { type: 'bar', x: 'title', series: ['borrows'] }
      };
    }
  ),

  report(
    'Borrowing Activity',
    'library-active-borrowers',
    'Active Borrowers',
    'Everyone with a book currently out — students and staff, in one list',
    [],
    async () => {
      const issues = await BookIssue.find({ status: 'issued' })
        .populate(ISSUE_POPULATE)
        .sort({ issue_date: 1 });

      const now = new Date();
      const rows = issues.map((issue) => {
        const borrower = borrowerLabel(issue);
        const overdue = isOverdue(issue, now);
        return {
          borrower: borrower.name,
          borrowerRef: borrower.ref,
          borrowerKind: borrower.kind,
          book: bookLabel(issue.book_id),
          issueDate: issue.issue_date,
          dueDate: issue.expected_return_date,
          overdueDays: overdue ? daysBetween(now, issue.expected_return_date) : 0
        };
      });

      return {
        columns: [
          { key: 'borrower', label: 'Borrower' },
          { key: 'borrowerRef', label: 'Ref' },
          { key: 'borrowerKind', label: 'Kind' },
          { key: 'book', label: 'Book' },
          { key: 'issueDate', label: 'Issued', type: 'date' },
          { key: 'dueDate', label: 'Due', type: 'date' },
          { key: 'overdueDays', label: 'Days Overdue', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Active Loans', value: rows.length },
          { label: 'Overdue', value: rows.filter((r) => r.overdueDays > 0).length },
          { label: 'Distinct Borrowers', value: new Set(rows.map((r) => `${r.borrowerKind}:${r.borrowerRef}`)).size }
        ]
      };
    }
  )
];

// ============================================================
// Overdue & Fines
// ============================================================

const overdueReports = [
  report(
    'Overdue & Fines',
    'library-overdue',
    'Overdue Items',
    'Every book that should have been returned by now',
    [],
    async () => {
      const now = new Date();
      const issues = await BookIssue.find({
        status: 'issued',
        expected_return_date: { $lt: now }
      })
        .populate(ISSUE_POPULATE)
        .sort({ expected_return_date: 1 });

      const rows = issues.map((issue) => {
        const borrower = borrowerLabel(issue);
        return {
          borrower: borrower.name,
          borrowerRef: borrower.ref,
          borrowerKind: borrower.kind,
          book: bookLabel(issue.book_id),
          issueDate: issue.issue_date,
          dueDate: issue.expected_return_date,
          daysOverdue: daysBetween(now, issue.expected_return_date)
        };
      });

      return {
        columns: [
          { key: 'borrower', label: 'Borrower' },
          { key: 'borrowerRef', label: 'Ref' },
          { key: 'borrowerKind', label: 'Kind' },
          { key: 'book', label: 'Book' },
          { key: 'issueDate', label: 'Issued', type: 'date' },
          { key: 'dueDate', label: 'Was Due', type: 'date' },
          { key: 'daysOverdue', label: 'Days Overdue', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Overdue Items', value: rows.length },
          {
            label: 'Longest Overdue',
            value: rows.length ? `${Math.max(...rows.map((r) => r.daysOverdue))} days` : '—'
          }
        ]
      };
    }
  ),

  report(
    'Overdue & Fines',
    'library-fines',
    'Library Fines',
    'Every fine raised for a late return, with its current status',
    [FILTERS.fineStatus, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const query = {};
      if (filters.fine_status) query.status = filters.fine_status;
      const range = dateRange(filters);
      if (range) query.registerDate = range;

      const fines = await LibraryFine.find(query)
        .populate({
          path: 'issue_id',
          select: 'book_id issue_date expected_return_date',
          populate: { path: 'book_id', select: 'book_name isbn' }
        })
        .populate('student_id', 'firstName lastName admissionNumber')
        .populate({
          path: 'staff_id',
          select: 'stf_no staffNo personId',
          populate: { path: 'personId', select: 'name' }
        })
        .sort({ registerDate: -1 });

      const rows = fines.map((fine) => {
        const borrower = borrowerLabel({ student_id: fine.student_id, staff_id: fine.staff_id });
        return {
          raisedOn: fine.registerDate,
          borrower: borrower.name,
          borrowerRef: borrower.ref,
          book: fine.issue_id?.book_id?.book_name ?? '—',
          amount: money(fine.amount),
          reason: fine.reason ?? '—',
          status: fine.status
        };
      });

      const totals = { unpaid: 0, paid: 0, waived: 0 };
      for (const row of rows) totals[row.status] = (totals[row.status] ?? 0) + row.amount;

      return {
        columns: [
          { key: 'raisedOn', label: 'Raised', type: 'date' },
          { key: 'borrower', label: 'Borrower' },
          { key: 'borrowerRef', label: 'Ref' },
          { key: 'book', label: 'Book' },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Fines', value: rows.length },
          { label: 'Unpaid', value: money(totals.unpaid) },
          { label: 'Paid', value: money(totals.paid) },
          { label: 'Waived', value: money(totals.waived) }
        ]
      };
    }
  )
];

// ============================================================
// Library Usage
// ============================================================

/** Bucket a timestamped list into calendar months, most recent first. */
const groupByMonth = (records, dateField) => {
  const buckets = new Map();
  for (const record of records) {
    const date = record[dateField];
    if (!date) continue;
    const key = new Date(date).toISOString().slice(0, 7); // YYYY-MM
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

const usageReports = [
  report(
    'Library Usage',
    'library-usage-summary',
    'Usage Summary',
    'Circulation, returns and in-library reading over the selected period',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const range = dateRange(filters);

      const [issues, returns, sessions] = await Promise.all([
        BookIssue.find(range ? { issue_date: range } : {}).select('issue_date status'),
        BookReturn.find(range ? { return_date: range } : {}).select('return_date late_days fine_amount'),
        ReadingSession.find(range ? { registerDate: range } : {}).select('registerDate hoursRead')
      ]);

      const issuesByMonth = groupByMonth(issues, 'issue_date');
      const returnsByMonth = groupByMonth(returns, 'return_date');
      const sessionsByMonth = groupByMonth(sessions, 'registerDate');

      // Merge the three series on month so the client can chart circulation vs
      // in-library reading side by side.
      const months = new Set([
        ...issuesByMonth.map((r) => r.month),
        ...returnsByMonth.map((r) => r.month),
        ...sessionsByMonth.map((r) => r.month)
      ]);
      const issuesByMonthMap = new Map(issuesByMonth.map((r) => [r.month, r.count]));
      const returnsByMonthMap = new Map(returnsByMonth.map((r) => [r.month, r.count]));
      const sessionsByMonthMap = new Map(sessionsByMonth.map((r) => [r.month, r.count]));

      const rows = Array.from(months)
        .sort()
        .map((month) => ({
          month,
          borrowings: issuesByMonthMap.get(month) ?? 0,
          returns: returnsByMonthMap.get(month) ?? 0,
          readingSessions: sessionsByMonthMap.get(month) ?? 0
        }));

      const totalHours = round1(sessions.reduce((s, r) => s + (r.hoursRead ?? 0), 0));
      const lateReturns = returns.filter((r) => (r.late_days ?? 0) > 0).length;

      return {
        columns: [
          { key: 'month', label: 'Month' },
          { key: 'borrowings', label: 'Borrowings', type: 'number' },
          { key: 'returns', label: 'Returns', type: 'number' },
          { key: 'readingSessions', label: 'Reading Sessions', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Borrowings', value: issues.length },
          { label: 'Returns', value: returns.length },
          { label: 'Late Returns', value: lateReturns },
          { label: 'Reading Sessions', value: sessions.length },
          { label: 'Total Reading Hours', value: totalHours }
        ],
        chart: { type: 'bar', x: 'month', series: ['borrowings', 'returns'] }
      };
    }
  ),

  report(
    'Library Usage',
    'library-reading-sessions',
    'In-Library Reading',
    'Reading sessions logged inside the library, per student',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const query = {};
      const range = dateRange(filters);
      if (range) query.registerDate = range;

      const sessions = await ReadingSession.find(query)
        .populate('st_id', 'firstName lastName admissionNumber')
        .populate('book_id', 'book_name')
        .sort({ registerDate: -1 });

      const rows = sessions.map((session) => ({
        date: session.registerDate,
        student: fullName(session.st_id) || '—',
        studentRef: session.st_id?.admissionNumber ?? '—',
        book: session.book_id?.book_name ?? '—',
        hoursRead: session.hoursRead ?? 0,
        status: session.status
      }));

      const totalHours = round1(rows.reduce((s, r) => s + r.hoursRead, 0));
      const distinctStudents = new Set(rows.map((r) => r.studentRef)).size;

      return {
        columns: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'student', label: 'Student' },
          { key: 'studentRef', label: 'Admission No' },
          { key: 'book', label: 'Book' },
          { key: 'hoursRead', label: 'Hours', type: 'number' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Sessions', value: rows.length },
          { label: 'Distinct Readers', value: distinctStudents },
          { label: 'Total Hours', value: totalHours }
        ]
      };
    }
  )
];

export const libraryReports = [
  ...inventoryReports,
  ...borrowingReports,
  ...overdueReports,
  ...usageReports
];
