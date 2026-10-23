import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentProfilePage from './StudentProfilePage';
import { studentsApi } from '../api/studentsApi';
import { academicApi } from '../../academic-structure/api/academicApi';

vi.mock('../api/studentsApi', () => ({
  studentsApi: {
    getById: vi.fn(), getReferenceData: vi.fn(), getAttendance: vi.fn(),
    getInvoices: vi.fn(), getDocuments: vi.fn(),
    update: vi.fn(), uploadDocument: vi.fn(), verifyDocument: vi.fn(), deleteDocument: vi.fn(),
  },
}));
vi.mock('../../academic-structure/api/academicApi', () => ({ academicApi: { getSubjects: vi.fn() } }));

describe('StudentProfilePage', () => {
  it('shows a valid student even when optional modules are unavailable', async () => {
    vi.mocked(studentsApi.getById).mockResolvedValue({
      _id: 'student-1', firstName: 'Ayaan', lastName: 'Ali', admissionNumber: 'ZU-2026-0001',
      gender: 'Female', birthDate: '2014-01-01', classId: { _id: 'class-1', cl_no: 'G1', cl_name: 'Grade 1' },
      sectionId: null, phoneNumber: '0610000000', address: 'Mogadishu', parentName: 'Hodan Ali',
      parentPhoneNumber: '0611111111', status: 'Active', guardians: [],
    });
    vi.mocked(studentsApi.getReferenceData).mockRejectedValue(new Error('reference unavailable'));
    vi.mocked(academicApi.getSubjects).mockRejectedValue(new Error('subjects unavailable'));
    vi.mocked(studentsApi.getAttendance).mockRejectedValue(new Error('attendance unavailable'));
    vi.mocked(studentsApi.getInvoices).mockRejectedValue(new Error('fees unavailable'));
    vi.mocked(studentsApi.getDocuments).mockRejectedValue(new Error('documents unavailable'));

    render(<MemoryRouter initialEntries={['/students/student-1']}><Routes><Route path="/students/:id" element={<StudentProfilePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Student Profile' })).toBeInTheDocument();
    expect(screen.getByText('Ayaan Ali')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load student.')).not.toBeInTheDocument();
  });
});
