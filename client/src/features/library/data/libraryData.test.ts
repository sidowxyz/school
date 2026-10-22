import { describe, expect, it, vi, afterEach } from 'vitest';
import { daysLate, estimatedFine, pickCopyNo } from './libraryData';
import type { BorrowRecord } from '../types';

function record(overrides: Partial<BorrowRecord>): BorrowRecord {
  return {
    id: 'r-test',
    bookId: 'b-test',
    copyNo: 1,
    studentId: 's-test',
    studentName: 'Test Student',
    rollNo: 'SB-TEST-000',
    className: 'Grade 10-A',
    borrowDate: '2026-06-01',
    dueDate: '2026-06-15',
    returnDate: null,
    status: 'Active',
    fine: 0,
    finePaid: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('daysLate', () => {
  it('is 0 for a record returned on or before its due date', () => {
    const r = record({ dueDate: '2026-06-15', returnDate: '2026-06-15', status: 'Returned' });
    expect(daysLate(r)).toBe(0);
  });

  it('counts whole days between due date and return date when late', () => {
    const r = record({ dueDate: '2026-06-15', returnDate: '2026-06-20', status: 'Returned' });
    expect(daysLate(r)).toBe(5);
  });

  it('never returns a negative number for an early return', () => {
    const r = record({ dueDate: '2026-06-20', returnDate: '2026-06-10', status: 'Returned' });
    expect(daysLate(r)).toBe(0);
  });

  it('measures against "now" for a still-active loan', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'));
    const r = record({ dueDate: '2026-07-05', returnDate: null, status: 'Active' });
    expect(daysLate(r)).toBe(5);
  });
});

describe('estimatedFine', () => {
  it('returns the already-recorded fine for a returned book, ignoring the rate argument', () => {
    const r = record({ status: 'Returned', fine: 4.5 });
    expect(estimatedFine(r, 999)).toBe(4.5);
  });

  it('computes days-late times the given rate for an active overdue loan', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'));
    const r = record({ dueDate: '2026-07-05', returnDate: null, status: 'Active' });
    expect(estimatedFine(r, 0.5)).toBe(2.5); // 5 days late * $0.50/day
  });

  it('is 0 for an active loan that is not yet due', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const r = record({ dueDate: '2026-07-05', returnDate: null, status: 'Active' });
    expect(estimatedFine(r, 0.5)).toBe(0);
  });
});

describe('pickCopyNo', () => {
  it('returns copy 1 when no copies of the book are currently checked out', () => {
    expect(pickCopyNo([], 'b1', 3)).toBe(1);
  });

  it('skips copy numbers already on an active loan', () => {
    const records = [
      record({ bookId: 'b1', copyNo: 1, status: 'Active' }),
      record({ bookId: 'b1', copyNo: 2, status: 'Active' }),
    ];
    expect(pickCopyNo(records, 'b1', 3)).toBe(3);
  });

  it('ignores returned records when deciding which copies are free', () => {
    const records = [record({ bookId: 'b1', copyNo: 1, status: 'Returned' })];
    expect(pickCopyNo(records, 'b1', 3)).toBe(1);
  });

  it('falls back to totalCopies when every copy is checked out', () => {
    const records = [
      record({ bookId: 'b1', copyNo: 1, status: 'Active' }),
      record({ bookId: 'b1', copyNo: 2, status: 'Active' }),
    ];
    expect(pickCopyNo(records, 'b1', 2)).toBe(2);
  });
});
