export interface Parent {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  familyId?: { _id: string; siblingCount: number; discountTier: string } | string | null;
  userId?: { _id: string; email: string; status: boolean } | string | null;
  childrenCount?: number;
  createdAt: string;
}

export interface ParentChild {
  _id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  status: string;
  classId?: { _id: string; cl_name: string } | null;
  sectionId?: { _id: string; name: string } | null;
}

export interface ParentDetail {
  parent: Parent;
  children: ParentChild[];
  discountPercent: number;
}

export interface ParentListResult {
  pagination: { page: number; limit: number; totalPages: number; totalRecords: number };
  parents: Parent[];
}

export interface CreateParentPayload {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  createPortalUser?: boolean;
  password?: string;
}

export interface CreateParentResult {
  parent: Parent;
  user: { _id: string; email: string } | null;
  temporaryPassword: string | null;
}

export interface UnassignedStudent {
  _id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId?: { _id: string; cl_name: string } | null;
}

export interface SiblingRule {
  _id: string;
  rule_id: string;
  rule_name: string;
  minimum_siblings: number;
  discount_percentage: number;
  is_active: boolean;
  description?: string;
}
