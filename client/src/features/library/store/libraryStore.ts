import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FINE_RATE_PER_DAY, DEFAULT_LOAN_DAYS } from '../data/libraryData';
import type { Book, BorrowRecord, LibrarySettings, Reservation } from '../types';
import { libraryApi } from '../api/libraryApi';

// Minimal student shape needed to place a (client-side) reservation.
export interface ReservationStudent { id: string; name: string; rollNo: string; className: string }

/** Bumped whenever persisted shape changes, so stale localStorage snapshots are discarded. */
const PERSIST_VERSION = 2;

let nextReservationNum = 1;

interface LibraryState {
  books: Book[];
  records: BorrowRecord[];
  reservations: Reservation[];
  settings: LibrarySettings;
  booksLoading: boolean;
  recordsLoading: boolean;
  loadBooks: () => Promise<void>;
  loadRecords: () => Promise<void>;
  addBook: (book: Omit<Book, 'id' | 'availableCopies' | 'archived'>) => Promise<void>;
  updateBook: (id: string, patch: Omit<Book, 'id' | 'availableCopies' | 'archived'>) => Promise<void>;
  deleteBook: (id: string) => Promise<boolean>;
  borrowBook: (studentId: string, bookId: string, loanDays?: number) => Promise<boolean>;
  returnBook: (recordId: string) => Promise<void>;
  payFine: (recordId: string) => Promise<void>;
  reserveBook: (student: ReservationStudent, bookId: string) => boolean;
  cancelReservation: (id: string) => void;
  fulfillReservation: (id: string) => void;
  updateSettings: (patch: Partial<LibrarySettings>) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
  // Books and records are loaded from the backend on mount — no mock seed.
  books: [],
  records: [],
  reservations: [],
  settings: { fineRatePerDay: DEFAULT_FINE_RATE_PER_DAY, defaultLoanDays: DEFAULT_LOAN_DAYS },
  booksLoading: false,
  recordsLoading: false,

  // Borrow records are served by the backend. Loaded on the Library page mount
  // and after every borrow/return/fine action.
  loadRecords: async () => {
    set({ recordsLoading: true });
    try {
      const records = await libraryApi.getIssues();
      set({ records });
    } catch (err) {
      console.error('Failed to load borrow records', err);
    } finally {
      set({ recordsLoading: false });
    }
  },

  // Books are now served by the backend catalog. loadBooks() is called on the
  // Library page mount and after every catalog mutation.
  loadBooks: async () => {
    set({ booksLoading: true });
    try {
      const books = await libraryApi.getBooks();
      set({ books });
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      set({ booksLoading: false });
    }
  },

  addBook: async (book) => {
    await libraryApi.createBook(book);
    await get().loadBooks();
  },

  updateBook: async (id, patch) => {
    await libraryApi.updateBook(id, patch);
    await get().loadBooks();
  },

  deleteBook: async (id) => {
    try {
      await libraryApi.deleteBook(id);
      await get().loadBooks();
      return true;
    } catch (err) {
      console.error('Failed to delete book', err);
      return false;
    }
  },

  borrowBook: async (studentId, bookId, loanDays) => {
    const days = loanDays ?? get().settings.defaultLoanDays;
    const due = new Date();
    due.setDate(due.getDate() + days);
    try {
      await libraryApi.issueBook({
        book_id: bookId,
        student_id: studentId,
        expected_return_date: due.toISOString().slice(0, 10),
      });
      await Promise.all([get().loadRecords(), get().loadBooks()]);
      return true;
    } catch (err) {
      console.error('Failed to borrow book', err);
      return false;
    }
  },

  returnBook: async (recordId) => {
    try {
      await libraryApi.returnIssue(recordId);
      await Promise.all([get().loadRecords(), get().loadBooks()]);
    } catch (err) {
      console.error('Failed to return book', err);
    }
  },

  payFine: async (recordId) => {
    const rec = get().records.find((r) => r.id === recordId);
    if (!rec?.fineId) return;
    try {
      await libraryApi.payFine(rec.fineId);
      await get().loadRecords();
    } catch (err) {
      console.error('Failed to mark fine paid', err);
    }
  },

  reserveBook: (student, bookId) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book || book.archived) return false;

    const newReservation: Reservation = {
      id: `res${nextReservationNum++}`,
      bookId,
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      className: student.className,
      reservedDate: new Date().toISOString().slice(0, 10),
      status: 'Pending',
    };
    set((state) => ({ reservations: [newReservation, ...state.reservations] }));
    return true;
  },

  cancelReservation: (id) => {
    set((state) => ({
      reservations: state.reservations.map((r) => (r.id === id ? { ...r, status: 'Cancelled' } : r)),
    }));
  },

  fulfillReservation: (id) => {
    set((state) => ({
      reservations: state.reservations.map((r) => (r.id === id ? { ...r, status: 'Fulfilled' } : r)),
    }));
  },

  updateSettings: (patch) => {
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },
    }),
    {
      name: 'sms-library-store',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Books, records, and reservations all reset each session (books/records
      // come from the backend; reservations are ephemeral). Only user settings
      // are cached, so nothing stale is ever restored.
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
