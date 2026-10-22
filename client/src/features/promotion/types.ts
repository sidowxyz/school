// Student Promotion / Class Transfer domain types.
// These mirror /api/promotions (server/src/services/promotionService.js).

export type TabId = 'setup' | 'review' | 'history';

export const TAB_IDS: TabId[] = ['setup', 'review', 'history'];

export type PromotionType = 'normal' | 'special' | 'retained' | 'graduated';
export type PromotionDecision = 'promote' | 'retain';

export interface SectionRef {
  _id: string;
  name: string;
}

export interface LadderClass {
  _id: string;
  cl_no: string;
  cl_name: string;
  level: string | null;
  promotion_order: number | null;
  is_final_class: boolean;
  student_count: number;
  has_sections: boolean;
  sections: SectionRef[];
  next_class: {
    _id: string;
    cl_name: string;
    has_sections: boolean;
    sections: SectionRef[];
  } | null;
}

export interface PromotionCandidate {
  studentId: string;
  rollNo: string;
  name: string;
  sectionId: string | null;
  sectionName: string | null;
  percentage: number | null;
  isPass: boolean | null;
  decision: PromotionDecision | null;
}

export interface PromotionPreview {
  class: { _id: string; cl_name: string; is_final_class: boolean };
  next_class: { _id: string; cl_name: string } | null;
  pass_percentage: number;
  has_results: boolean;
  students: PromotionCandidate[];
}

export interface WorkingDecision extends PromotionCandidate {
  decision: PromotionDecision;
  overridden: boolean;
}

export interface PromoteClassPayload {
  class_id: string;
  year_id?: string;
  decisions: {
    studentId: string;
    decision: PromotionDecision;
    percentage?: number | null;
  }[];
  section_map?: Record<string, string | null>;
}

export interface PromoteClassResult {
  batch_id: string;
  from_class: { _id: string; cl_name: string };
  to_class: { _id: string; cl_name: string } | null;
  promoted: number;
  retained: number;
  graduated: number;
  records: number;
}

export interface SpecialPromotionPayload {
  student_id: string;
  to_class_id: string;
  to_section_id?: string | null;
  year_id?: string;
  reason: string;
}

interface NamedRef {
  _id: string;
  cl_name?: string;
  name?: string;
  y_name?: string;
}

export interface PromotionRecord {
  _id: string;
  type: PromotionType;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
  from_class: NamedRef | null;
  from_section: NamedRef | null;
  to_class: NamedRef | null;
  to_section: NamedRef | null;
  academic_year: NamedRef | null;
  reason?: string;
  percentage?: number | null;
  batch_id?: string;
  performed_by: {
    _id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  performed_at: string;
}
