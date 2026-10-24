// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AcademicCalendar from './AcademicCalendar';
import { settingsApi, type AcademicCalendarData } from '../api/settingsApi';

vi.mock('../api/settingsApi', async () => {
  const actual = await vi.importActual<typeof import('../api/settingsApi')>('../api/settingsApi');
  return {
    ...actual,
    settingsApi: {
      getAcademicCalendar: vi.fn(),
      createHoliday: vi.fn(),
      updateHoliday: vi.fn(),
      deleteHoliday: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    },
  };
});

const calendarData: AcademicCalendarData = {
  academicYears: [{ _id: 'year-1', y_no: '2026', y_name: '2026/2027' }],
  selectedAcademicYear: { _id: 'year-1', y_no: '2026', y_name: '2026/2027' },
  activeTerm: { _id: 'term-1', name: 'Term One', startDate: '2026-08-01', endDate: '2026-12-20' },
  sessionStart: '2026-08-01',
  sessionEnd: '2027-06-20',
  events: [],
  holidays: [{ _id: 'holiday-1', name: 'Founders Day', date: '2026-09-01', academicYearId: 'year-1' }],
  schoolEvents: [],
};

const renderCalendar = () => render(<MemoryRouter><AcademicCalendar /></MemoryRouter>);

describe('AcademicCalendar settings actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getAcademicCalendar).mockResolvedValue(calendarData);
  });

  it('creates a holiday from the Add Holiday dialog', async () => {
    // The date picker opens on the current month; pin "today" so it shows October 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15));
    const user = userEvent.setup();
    renderCalendar();

    const [addHolidayButton] = await screen.findAllByRole('button', { name: /add holiday/i });
    await user.click(addHolidayButton);
    await user.type(screen.getByLabelText('Holiday name'), 'Independence Day');
    await user.click(screen.getByLabelText('Start date'));
    await user.click(await screen.findByRole('button', { name: /^\w{3},? 1 Oct 2026$/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^add holiday$/i }));
    vi.useRealTimers();

    await waitFor(() => expect(settingsApi.createHoliday).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Independence Day',
      date: '2026-10-01',
      academicYearId: 'year-1',
    })));
  });

  it('edits an existing holiday', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Edit Founders Day' }));
    const name = screen.getByLabelText('Holiday name');
    await user.clear(name);
    await user.type(name, 'Updated Founders Day');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(settingsApi.updateHoliday).toHaveBeenCalledWith(
      'holiday-1',
      expect.objectContaining({ title: 'Updated Founders Day' }),
    ));
  });

  it('deletes an existing holiday after confirmation', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(await screen.findByRole('button', { name: 'Delete Founders Day' }));
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(settingsApi.deleteHoliday).toHaveBeenCalledWith('holiday-1'));
  });
});
