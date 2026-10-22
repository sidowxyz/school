// Library constants and derived helpers.
//
// Books, borrow records and fines all come from the API via libraryStore /
// libraryApi — nothing here fabricates them. What remains is the fixed
// category list, the default loan settings, and pure functions that compute
// over whatever books/records the store passes in.

import type { Book, BookCategory, BorrowRecord, Reservation } from '../types';

export const CATEGORIES: BookCategory[] = [
  'Mathematics', 'Science', 'Fiction', 'History', 'Language', 'Computer Science', 'Religious Studies', 'Geography',
];

export const CATEGORY_COLORS: Record<BookCategory, string> = {
  Mathematics: 'bg-blue-100 text-blue-700',
  Science: 'bg-teal-100 text-teal-700',
  Fiction: 'bg-purple-100 text-purple-700',
  History: 'bg-amber-100 text-amber-700',
  Language: 'bg-pink-100 text-pink-700',
  'Computer Science': 'bg-indigo-100 text-indigo-700',
  'Religious Studies': 'bg-green-100 text-green-700',
  Geography: 'bg-cyan-100 text-cyan-700',
};

/** Default late fee rate and loan period — overridable via the store's live settings. */
export const DEFAULT_FINE_RATE_PER_DAY = 0.5;
export const DEFAULT_LOAN_DAYS = 14;

// Derived helpers (pure — operate on whatever books/records are passed in)

export function bookById(books: Book[], id: string): Book | undefined {
  return books.find((b) => b.id === id);
}

export function isOverdue(r: BorrowRecord): boolean {
  return r.status === 'Active' && new Date(r.dueDate).getTime() < Date.now();
}

export function daysLate(r: BorrowRecord): number {
  const end = r.returnDate ? new Date(r.returnDate) : new Date();
  const diff = Math.floor((end.getTime() - new Date(r.dueDate).getTime()) / 86400000);
  return Math.max(0, diff);
}

export function estimatedFine(r: BorrowRecord, ratePerDay = DEFAULT_FINE_RATE_PER_DAY): number {
  if (r.status === 'Returned') return r.fine;
  return Math.round(daysLate(r) * ratePerDay * 100) / 100;
}

/** Finds the smallest copy number (1..totalCopies) not currently checked out for a book. */
export function pickCopyNo(records: BorrowRecord[], bookId: string, totalCopies: number): number {
  const used = new Set(records.filter((r) => r.bookId === bookId && r.status === 'Active').map((r) => r.copyNo));
  for (let n = 1; n <= totalCopies; n++) {
    if (!used.has(n)) return n;
  }
  return totalCopies;
}

export function libraryStats(books: Book[], records: BorrowRecord[]) {
  const active = books.filter((b) => !b.archived);
  const totalCopies = active.reduce((sum, b) => sum + b.totalCopies, 0);
  const availableCopies = active.reduce((sum, b) => sum + b.availableCopies, 0);
  const activeLoans = records.filter((r) => r.status === 'Active');
  const overdue = activeLoans.filter(isOverdue);
  const studentsBorrowing = new Set(activeLoans.map((r) => r.studentId)).size;
  const today = new Date().toDateString();
  const returnedToday = records.filter((r) => r.returnDate && new Date(r.returnDate).toDateString() === today).length;
  const outstandingFines = records.filter((r) => r.status === 'Returned' && !r.finePaid).reduce((sum, r) => sum + r.fine, 0);
  return {
    totalCopies, uniqueTitles: active.length, availableCopies,
    borrowedCount: activeLoans.length, overdueCount: overdue.length,
    studentsBorrowing, returnedToday, outstandingFines,
  };
}

export function topBorrowedBooks(books: Book[], records: BorrowRecord[], limit = 5) {
  const counts = new Map<string, number>();
  records.forEach((r) => counts.set(r.bookId, (counts.get(r.bookId) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([bookId, count]) => ({ book: bookById(books, bookId), count }))
    .filter((x): x is { book: Book; count: number } => !!x.book)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function monthlyBorrowReturnTrend(records: BorrowRecord[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const monthIndex = (iso: string) => new Date(iso).getMonth();
  return months.map((label, i) => ({
    month: label,
    Borrowed: records.filter((r) => monthIndex(r.borrowDate) === i).length,
    Returned: records.filter((r) => r.returnDate && monthIndex(r.returnDate) === i).length,
  }));
}

export function recentActivity(records: BorrowRecord[], limit = 6) {
  return [...records]
    .map((r) => ({ record: r, eventDate: r.returnDate ?? r.borrowDate, event: r.returnDate ? ('Returned' as const) : ('Borrowed' as const) }))
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, limit);
}

export function categoryDistribution(books: Book[]) {
  const active = books.filter((b) => !b.archived);
  return CATEGORIES
    .map((cat) => ({ category: cat, count: active.filter((b) => b.category === cat).length }))
    .filter((c) => c.count > 0);
}

export function pendingReservationsCount(reservations: Reservation[]) {
  return reservations.filter((r) => r.status === 'Pending').length;
}

export function studentBorrowHistory(records: BorrowRecord[], studentId: string) {
  return records
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
}

export function formatUSD(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
