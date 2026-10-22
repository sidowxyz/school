import api from '../../../lib/axios';
import type { Book, BorrowRecord } from '../types';

// The catalog payload (no server-managed fields). The backend find-or-creates
// the author/category/shelf records from these plain-text values.
export type BookInput = Omit<Book, 'id' | 'availableCopies' | 'archived'>;

export interface BookCategoryRef { _id: string; cat_name: string }

export const libraryApi = {
  // Catalog
  getBooks: async (): Promise<Book[]> =>
    (await api.get('/library/books', { params: { limit: 1000 } })).data.data.books,
  // Book categories — used by report filters and any category picker. The
  // server wraps the list in `{ pagination, categories }`, so we unwrap here
  // and ask for a big enough page to serve as the whole reference list.
  getCategories: async (): Promise<BookCategoryRef[]> =>
    (await api.get('/library/categories', { params: { limit: 500 } })).data.data.categories ?? [],
  createBook: async (data: BookInput): Promise<Book> =>
    (await api.post('/library/books', data)).data.data,
  updateBook: async (id: string, data: BookInput): Promise<Book> =>
    (await api.put(`/library/books/${id}`, data)).data.data,
  deleteBook: (id: string) => api.delete(`/library/books/${id}`),

  // Borrow / return / fines
  getIssues: async (): Promise<BorrowRecord[]> =>
    (await api.get('/library/issues')).data.data,
  issueBook: (data: { book_id: string; student_id: string; expected_return_date?: string }) =>
    api.post('/library/issues', data),
  returnIssue: (issueId: string) => api.post('/library/returns', { issue_id: issueId }),
  payFine: (fineId: string) => api.put(`/library/fines/${fineId}/status`, { status: 'paid' }),

  // In-library reading sessions. Read by the Library Usage report; write
  // path used by the Reading tab in LibraryPage so a librarian can log a
  // session as a student checks out a book they read on site.
  getReadingSessions: async (): Promise<ReadingSessionRecord[]> =>
    (await api.get('/library/reading-sessions')).data.data.sessions ?? [],
  logReadingSession: (data: {
    st_id: string;
    book_id: string;
    hoursRead?: number;
    status?: 'reading' | 'completed' | 'interrupted';
    timeOut?: string | null;
  }) => api.post('/library/reading-sessions', data),
};

export interface ReadingSessionRecord {
  _id: string;
  st_id: { _id: string; firstName: string; lastName: string; admissionNumber: string } | null;
  book_id: { _id: string; book_name: string; isbn?: string } | null;
  status: 'reading' | 'completed' | 'interrupted';
  hoursRead: number;
  timeOut?: string | null;
  registerDate: string;
}
