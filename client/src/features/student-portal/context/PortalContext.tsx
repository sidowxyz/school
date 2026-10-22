import { createContext, useContext } from 'react';
import type { Student } from '../../students/types';

interface PortalContextValue {
  // The student whose portal is being viewed (real record when available).
  student: Student | null;
  // undefined  → a logged-in student viewing their own data (self routes)
  // set        → an admin/staff member viewing this specific student (id routes)
  studentId?: string;
}

const PortalContext = createContext<PortalContextValue>({ student: null });

export const PortalProvider = PortalContext.Provider;
export const usePortal = () => useContext(PortalContext);
