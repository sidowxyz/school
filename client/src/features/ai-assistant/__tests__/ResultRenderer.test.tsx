import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResultRenderer from '../components/ResultRenderer';

describe('ResultRenderer', () => {
  it('renders scalar fields as labelled stat tiles', () => {
    render(<ResultRenderer data={{ totalStudents: 842, attendanceRate: 93.8 }} />);

    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('842')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
  });

  it('flattens nested summary objects into the same tile grid', () => {
    render(<ResultRenderer data={{ summary: { totalStudents: 12, totalTeachers: 3 } }} />);

    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Total Teachers')).toBeInTheDocument();
  });

  it('renders an array of records as a table', () => {
    render(
      <ResultRenderer
        data={{ students: [{ firstName: 'Amina', admissionNumber: 'ZU-2026-0001' }] }}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
    expect(screen.getByText('ZU-2026-0001')).toBeInTheDocument();
  });

  // Credential containment is enforced server-side, but the renderer must not
  // display these fields even if a payload somehow carries them.
  it('never renders identifier or credential columns', () => {
    render(
      <ResultRenderer
        data={{
          students: [
            { _id: 'abc123', password: 'HASH', refreshToken: 'RT', firstName: 'Ayan' },
          ],
        }}
      />
    );

    expect(screen.getByText('Ayan')).toBeInTheDocument();
    expect(screen.queryByText('HASH')).not.toBeInTheDocument();
    expect(screen.queryByText('RT')).not.toBeInTheDocument();
    expect(screen.queryByText('abc123')).not.toBeInTheDocument();
  });

  // An empty result is a real answer — no attendance taken yet, no overdue
  // books — so it must read as one rather than as a failure.
  it('states plainly when there are no records', () => {
    render(<ResultRenderer data={[]} />);
    expect(screen.getByText(/no records matching that yet/i)).toBeInTheDocument();
  });

  it('truncates long tables behind a show-all control', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ name: `Student ${i}` }));
    render(<ResultRenderer data={rows} />);

    expect(screen.getByText('Student 0')).toBeInTheDocument();
    expect(screen.queryByText('Student 19')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show all 20/i })).toBeInTheDocument();
  });

  it('renders nothing for empty payloads rather than throwing', () => {
    const { container } = render(<ResultRenderer data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('formats dates and booleans readably', () => {
    render(<ResultRenderer data={{ isActive: true, dueDate: '2026-03-04' }} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});
