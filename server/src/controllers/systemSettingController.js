import SystemSetting from '../models/SystemSetting.js';
import Year from '../models/Year.js';
import Term from '../models/Term.js';
import mongoose from 'mongoose';

const getOrCreateSettings = async () => {
  let settings = await SystemSetting.findOne();
  if (!settings) settings = await SystemSetting.create({});
  return settings;
};

const notFound = (res, resource) => res.status(404).json({
  success: false,
  message: `${resource} not found`,
});
// 1. GET: Get all system settings (creates default if not found)
export const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// 2. PUT: Update settings (only admin/manager allowed)
export const updateSystemSettings = async (req, res, next) => {
  try {
    let settings = await getOrCreateSettings();

    settings = await SystemSetting.findByIdAndUpdate(
      settings._id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Configuration updated successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadSchoolLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a logo image.' });
    }

    const settings = await getOrCreateSettings();
    settings.logoUrl = `/uploads/${req.file.filename}`;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'School logo updated successfully',
      data: { logoUrl: settings.logoUrl },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/settings/academic-calendar
// Consolidates real Academic Structure and Settings data.
export const getAcademicCalendar = async (req, res, next) => {
  try {
    const now = new Date();
    const settings = await getOrCreateSettings();
    const academicYears = await Year.find().sort({ y_no: -1 }).lean();
    const allTerms = await Term.find().sort({ startDate: 1 }).lean();

    let selectedYearId = req.query.academicYearId;
    if (selectedYearId && !mongoose.isValidObjectId(selectedYearId)) {
      return res.status(400).json({ success: false, message: 'Invalid academic year' });
    }

    if (!selectedYearId) {
      const currentTerm = allTerms.find((term) =>
        term.startDate && term.endDate && new Date(term.startDate) <= now && new Date(term.endDate) >= now
      ) || allTerms.find((term) => term.status === 'active');
      selectedYearId = currentTerm?.academicYearId?.toString() || academicYears[0]?._id?.toString();
    }

    const selectedYear = academicYears.find((year) => year._id.toString() === selectedYearId) || null;
    const terms = allTerms.filter((term) => term.academicYearId.toString() === selectedYearId);
    const activeTerm = terms.find((term) =>
      term.startDate && term.endDate && new Date(term.startDate) <= now && new Date(term.endDate) >= now
    ) || terms.find((term) => term.status === 'active') || null;

    const sessionStart = terms
      .filter((term) => term.startDate)
      .map((term) => new Date(term.startDate))
      .sort((a, b) => a - b)[0] || null;
    const sessionEnd = terms
      .filter((term) => term.endDate)
      .map((term) => new Date(term.endDate))
      .sort((a, b) => b - a)[0] || null;

    const events = [];
    if (sessionStart) events.push({
      id: `session-start-${selectedYearId}`,
      title: `${selectedYear?.y_name || 'Academic session'} Begins`,
      date: sessionStart,
      type: 'session',
      source: 'academic-structure',
    });
    if (sessionEnd) events.push({
      id: `session-end-${selectedYearId}`,
      title: `${selectedYear?.y_name || 'Academic session'} Ends`,
      date: sessionEnd,
      type: 'session',
      source: 'academic-structure',
    });

    terms.forEach((term) => {
      if (term.startDate) events.push({ id: `term-start-${term._id}`, title: `${term.name} Begins`, date: term.startDate, type: 'term', source: 'academic-structure' });
      if (term.endDate) events.push({ id: `term-end-${term._id}`, title: `${term.name} Ends`, date: term.endDate, type: 'term', source: 'academic-structure' });
    });

    settings.holidays
      .filter((holiday) => !holiday.academicYearId || holiday.academicYearId.toString() === selectedYearId)
      .forEach((holiday) => events.push({
        id: holiday._id.toString(), title: holiday.name, date: holiday.date, endDate: holiday.endDate,
        type: 'holiday', source: 'settings', description: holiday.description || '', editable: true,
      }));

    settings.calendarEvents
      .filter((event) => !event.academicYearId || event.academicYearId.toString() === selectedYearId)
      .forEach((event) => events.push({
        id: event._id.toString(), title: event.title, date: event.date, endDate: event.endDate,
        type: 'event', source: 'settings', description: event.description || '', editable: true,
      }));

    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      data: {
        academicYears,
        selectedAcademicYear: selectedYear,
        activeTerm,
        sessionStart,
        sessionEnd,
        events,
        holidays: settings.holidays.filter((holiday) => !holiday.academicYearId || holiday.academicYearId.toString() === selectedYearId),
        schoolEvents: settings.calendarEvents.filter((event) => !event.academicYearId || event.academicYearId.toString() === selectedYearId),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    settings.holidays.push(req.body);
    await settings.save();
    res.status(201).json({ success: true, message: 'Holiday added successfully', data: settings.holidays.at(-1) });
  } catch (error) { next(error); }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const holiday = settings.holidays.id(req.params.holidayId);
    if (!holiday) return notFound(res, 'Holiday');
    holiday.set(req.body);
    await settings.save();
    res.status(200).json({ success: true, message: 'Holiday updated successfully', data: holiday });
  } catch (error) { next(error); }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const holiday = settings.holidays.id(req.params.holidayId);
    if (!holiday) return notFound(res, 'Holiday');
    holiday.deleteOne();
    await settings.save();
    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) { next(error); }
};

export const createCalendarEvent = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    settings.calendarEvents.push(req.body);
    await settings.save();
    res.status(201).json({ success: true, message: 'Event added successfully', data: settings.calendarEvents.at(-1) });
  } catch (error) { next(error); }
};

export const updateCalendarEvent = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const event = settings.calendarEvents.id(req.params.eventId);
    if (!event) return notFound(res, 'Event');
    event.set(req.body);
    await settings.save();
    res.status(200).json({ success: true, message: 'Event updated successfully', data: event });
  } catch (error) { next(error); }
};

export const deleteCalendarEvent = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const event = settings.calendarEvents.id(req.params.eventId);
    if (!event) return notFound(res, 'Event');
    event.deleteOne();
    await settings.save();
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) { next(error); }
};
