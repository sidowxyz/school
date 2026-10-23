export type StudentStatus = "Active" | "Inactive" | "Suspended" | "Graduated";

// lev_no comes back as a raw (unpopulated) Level ObjectId string — GET
// /students only shallow-populates classId, not classId.lev_no.
export interface RefClassTeacher { _id: string; staffId: string; userId?: { firstName: string; lastName: string } }
export interface RefClass { _id: string; cl_no: string; cl_name: string; lev_no?: string }
export interface RefSection { _id: string; name: string; class: string; classTeacherId?: string | RefClassTeacher | null }

export interface RefGuardian {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  childrenCount: number;
  familyId?: { _id: string; siblingCount: number; discountTier: string } | string | null;
}

export interface AssignedGuardian { _id: string; name: string; phone: string; email?: string }

export interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  userId?: string | null;
  admissionNumber: string;
  gender: "Male" | "Female";
  birthDate: string;
  classId: string | RefClass | null;
  sectionId: string | RefSection | null;
  phoneNumber: string;
  address: string;
  parentName: string;
  parentPhoneNumber: string;
  status: StudentStatus;
  bloodGroup?: string | null;
  city?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  previousSchool?: string | null;
  house?: string | null;
  // Populated from guardians[0].guardianId — the real, admin-assigned parent
  // link (distinct from the legacy free-text parentName/parentPhoneNumber).
  guardians?: { guardianId: AssignedGuardian | string; isPrimary: boolean }[];
  parentPortalCredentials?: { email: string; temporaryPassword: string };
}

export interface GuardianRegistration {
  mode: "new" | "existing";
  guardianId?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  createPortalUser?: boolean;
}

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email?: string;
  gender: "Male" | "Female";
  birthDate: string;
  classId: string;
  sectionId?: string | null;
  phoneNumber: string;
  address: string;
  parentName: string;
  parentPhoneNumber: string;
  status?: StudentStatus;
  bloodGroup?: string;
  city?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  previousSchool?: string;
  house?: string;
  guardian?: GuardianRegistration;
}

export interface StudentListResult {
  pagination: { page: number; limit: number; totalPages: number; totalRecords: number };
  students: Student[];
}

export interface StudentReferenceData {
  classes: RefClass[];
  sections: RefSection[];
  guardians: RefGuardian[];
}

export interface CreateStudentAccountResult {
  account: { _id: string; email: string };
  student: Student;
  temporaryPassword: string;
}

// Student portal data — reused on the admin Student Profile page via the
// "/:studentId/..." variants of these routes (server/src/routes/studentPortalRoutes.js).

export interface AttendanceRecord {
  _id: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  att_date: string;
  periodId?: { per_no: string; per_name: string; time_in: string; time_out: string } | string;
}

export interface AttendancePortalResult {
  total: number;
  summary: Record<string, number>;
  records: AttendanceRecord[];
}

export interface Invoice {
  _id: string;
  invoice_no: string;
  fee_struc_no: { fee_type_no?: { fee_name: string } | string; amount: number } | string;
  invoice_amount: number;
  paid_amount: number;
  balance: number;
  status: "Unpaid" | "Partially_Paid" | "Paid";
  dueDate?: string;
  registerDate: string;
}

export interface InvoicesPortalResult {
  totals: { invoiced: number; paid: number; balance: number };
  invoices: Invoice[];
}

// Student documents (Documents tab)

export interface StudentDocument {
  _id: string;
  student: string;
  name: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  status: "Pending" | "Verified";
  uploadedBy?: { firstName: string; lastName: string } | string;
  verifiedBy?: { firstName: string; lastName: string } | string | null;
  verifiedAt?: string | null;
  createdAt: string;
}
