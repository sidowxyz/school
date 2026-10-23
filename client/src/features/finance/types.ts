export interface RefLevel { _id: string; lev_no: string; lev_name: string }
export interface RefYear { _id: string; y_no: string; y_name: string }

export interface FeeType {
  _id: string;
  fee_type_no: string;
  fee_name: string;
}

export interface FeeStructure {
  _id: string;
  fee_struc_no: string;
  fee_type_no: FeeType;
  lev_no: RefLevel;
  y_no: RefYear;
  amount: number;
}

export interface PaymentMethod {
  _id: string;
  payment_method_no: string;
  payment_method_name: string;
}

export interface StudentRef { _id: string; firstName: string; lastName: string; admission_no?: string; admissionNumber?: string }

export interface StudentInvoice {
  _id: string;
  invoice_no: string;
  student: StudentRef;
  fee_struc_no: FeeStructure;
  invoice_amount: number;
  original_amount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  paid_amount: number;
  balance: number;
  status: "Unpaid" | "Partially_Paid" | "Paid";
  dueDate?: string;
  registerDate: string;
}

export interface StudentFee {
  _id: string;
  student_fee_no: string;
  invoice_no: StudentInvoice;
  payment_method_no: PaymentMethod;
  paid_amount: number;
  acc_no?: string;
  registerDate: string;
  registerBy?: string;
  // Set once the receipt PDF has been generated (server-side path) —
  // undefined for records created before that existed. Only used as a
  // presence check on the client; the path itself is never navigated to
  // directly (auth requires the Bearer token, not a plain link).
  pdfPath?: string;
}

export interface Refund {
  _id: string;
  refund_no: string;
  student_fee_no: { _id: string; student_fee_no: string; paid_amount: number; registerDate: string };
  invoice_no: { _id: string; invoice_no: string; invoice_amount?: number; paid_amount?: number; balance?: number; status?: string };
  student: StudentRef & { classId?: { _id: string; cl_name: string } };
  amount: number;
  reason: string;
  payment_method_no?: PaymentMethod;
  status: "issued" | "reversed";
  authorisedBy?: { _id: string; username?: string; firstName?: string; lastName?: string };
  refundDate: string;
}

export interface StudentScholarship {
  _id: string;
  student_scholarship_id: string;
  st_no: { _id: string; firstName: string; lastName: string; admissionNumber?: string; classId?: { _id: string; cl_name: string } };
  scholarship_id?: {
    _id: string;
    discount_value: number;
    scholar_type_no?: { scholarship_name: string };
    discount_type_id?: { discount_type_name: string };
  };
  startDate: string;
  endDate: string;
  status_no: { st_name: string };
  remarks?: string;
}

export interface OutstandingStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  className: string;
  balance: number;
  invoiceCount: number;
}

export interface FinanceSummary {
  totals: { totalFees: number; paidFees: number; outstanding: number; collectionRate: number };
  statusDistribution: { name: string; value: number }[];
  monthlyCollection: { month: string; collected: number }[];
  weeklyCollection: { week: string; collected: number }[];
  /** Same-day payments — amount received and how many transactions. */
  todaysPayments: { amount: number; count: number };
  /** Distinct student count with any open balance across every invoice. */
  outstandingStudentsCount: number;
  /** Top 10 by outstanding balance, biggest first. */
  topOutstanding: OutstandingStudent[];
  /** Daily collected total for the last 30 days; sparse (only days with a payment). */
  dailyCollection: { date: string; collected: number }[];
}
