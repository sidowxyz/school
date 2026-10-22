export interface Year {
  _id: string;
  y_no: string;
  y_name: string;
}

export interface Level {
  _id: string;
  lev_no: string;
  lev_name: string;
}

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface Term {
  _id: string;
  name: string;
  academicYearId: string | { _id: string; y_name: string; y_no: string };
  startDate?: string;
  endDate?: string;
  status: "active" | "inactive";
  workingDays: Weekday[];
}

export interface Class {
  _id: string;
  cl_no: string;
  cl_name: string;
  lev_no: string | { _id: string; lev_name: string; lev_no: string };
}

export interface Section {
  _id: string;
  name: string;
  class: string | { _id: string; cl_name: string; cl_no: string };
  classTeacherId?: string | { _id: string; staffId: string; userId?: { firstName: string; lastName: string } } | null;
}

export interface Subject {
  _id: string;
  sub_no: string;
  sub_name: string;
  subjectCode?: string;
  classId?: string;
  status: "active" | "inactive";
}

export interface Period {
  _id: string;
  termId: string | { _id: string; name: string };
  per_no: string;
  per_name: string;
  time_in: string;
  time_out: string;
}
