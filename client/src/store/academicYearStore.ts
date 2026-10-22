import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AcademicYearState {
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
}

// Shared across the top bar's year picker and any page that needs to scope its
// data (e.g. the student list) to whichever academic year is currently selected.
export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set) => ({
      selectedYearId: '',
      setSelectedYearId: (id) => set({ selectedYearId: id }),
    }),
    { name: 'sms-academic-year' }
  )
);
