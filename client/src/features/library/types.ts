export type TabId =
  | 'dashboard' | 'catalog' | 'borrow' | 'return' | 'reading' | 'history' | 'fines' | 'students' | 'analytics';

export const TAB_IDS: TabId[] = [
  'dashboard', 'catalog', 'borrow', 'return', 'reading', 'history', 'fines', 'students', 'analytics',
];

export type BookCategory =
  | 'Mathematics' | 'Science' | 'Fiction' | 'History' | 'Language'
  | 'Computer Science' | 'Religious Studies' | 'Geography';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  totalCopies: number;
  availableCopies: number;
  addedDate: string;
  rack: string;
  /** Soft-deleted books are hidden from the catalog/borrow flow but stay resolvable so past records keep their title. */
  archived?: boolean;
}

export type BorrowStatus = 'Active' | 'Returned';

export interface BorrowRecord {
  id: string;
  bookId: string;
  /** Which physical copy of the book (1..totalCopies) this loan is tracking. */
  copyNo: number;
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: BorrowStatus;
  fine: number;
  finePaid: boolean;
  /** Backend fine record id, when a fine exists — used to mark it paid. */
  fineId?: string | null;
}

export type ReservationStatus = 'Pending' | 'Fulfilled' | 'Cancelled';

export interface Reservation {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  reservedDate: string;
  status: ReservationStatus;
}

export interface LibrarySettings {
  fineRatePerDay: number;
  defaultLoanDays: number;
}
