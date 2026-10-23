// Monthly class fees — mirrors server/src/services/monthlyFeeService.js.
// A "period" is a billing month written as YYYY-MM.

export interface ClassFee {
  _id: string;
  name: string;
  level: string;
  level_id: string | null;
  students: number;
  monthly_fee: number | null;
}

export interface ChargeResult {
  period: string;
  classes: number;
  created: number;
  alreadyCharged: number;
  failed: { student: string; message: string }[];
}

export type InvoiceStatus = 'Unpaid' | 'Partially_Paid' | 'Paid';

export interface OwedLine {
  invoiceId: string;
  invoice_no: string;
  period: string | null;
  description: string;
  amount: number;
  original: number;
  discount: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
}

export interface FeeDiscount {
  kind: 'percent' | 'amount';
  value: number;
  reason?: string;
}

export interface AccountStudent {
  _id: string;
  name: string;
  admissionNumber: string;
  className: string;
  status: string;
  monthlyFee: {
    amount: number;
    net: number;
    discount: number;
    parts: { siblingPct: number; scholarshipPct: number; ownPct: number; ownAmount: number };
  } | null;
  feeDiscount: FeeDiscount | null;
  paidThrough: string | null;
  outstanding: OwedLine[];
  totalOwed: number;
}

export interface FeeAccount {
  family: { _id: string; name: string; phone: string } | null;
  currentPeriod: string;
  students: AccountStudent[];
  totalOwed: number;
}

export interface CollectPaymentInput {
  student_ids: string[];
  amount: number;
  pay_through?: string;
  invoice_ids?: string[];
  payment_method: string;
  payer_name?: string;
  payer_phone?: string;
  reference?: string;
  note?: string;
}

interface NamedStudent { _id: string; firstName: string; lastName: string; admissionNumber?: string }

export interface FeeReceipt {
  _id: string;
  receipt_no: string;
  students: NamedStudent[];
  payer_name?: string;
  payer_phone?: string;
  lines: {
    _id: string;
    student: NamedStudent;
    period?: string;
    description: string;
    amount: number;
    balance_after: number;
  }[];
  total: number;
  payment_method: { _id: string; payment_method_name: string } | null;
  reference?: string;
  note?: string;
  received_by_name?: string;
  received_at: string;
  remainingByStudent?: { student: string; balance: number }[];
}

export interface ClassStatusRow {
  studentId: string;
  name: string;
  admissionNumber: string;
  month: OwedLine | null;
  status: InvoiceStatus | 'Not charged';
  previousBalance: number;
  totalOwed: number;
  paidAheadThrough: string | null;
}

export interface ClassStatus {
  class: { _id: string; name: string };
  period: string;
  monthlyFee: number | null;
  rows: ClassStatusRow[];
  summary: {
    students: number;
    paid: number;
    partial: number;
    unpaid: number;
    notCharged: number;
    charged: number;
    collected: number;
    outstanding: number;
    previousOutstanding: number;
  };
}

interface ReportAmounts {
  charged: number;
  discount: number;
  net: number;
  collected: number;
  outstanding: number;
  paid: number;
  partial: number;
  unpaid: number;
}

export interface FeeReport {
  from: string;
  to: string;
  totals: { charged: number; discount: number; net: number; collected: number; outstanding: number; students: number; collectionRate: number };
  byClass: (ReportAmounts & { _id: string; name: string; students: number })[];
  byMonth: (ReportAmounts & { period: string })[];
  byStudent: (ReportAmounts & { _id: string; name: string; admissionNumber: string; className: string; months: number })[];
}

/** "2026-07" → "July 2026" */
export const periodLabel = (period: string | null | undefined, short = false) => {
  if (!period) return '—';
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: short ? 'short' : 'long', year: 'numeric' });
};

export const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const thisPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const money = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export interface StudentBalanceRow {
  _id: string;
  name: string;
  admissionNumber: string;
  className: string;
  familyName: string | null;
  parentName: string;
  totalOwed: number;
  unpaidCount: number;
  paidThrough: string | null;
}

export interface StudentBalancePage {
  rows: StudentBalanceRow[];
  total: number;
  page: number;
  pages: number;
  totalOwed: number;
  owingCount: number;
}
