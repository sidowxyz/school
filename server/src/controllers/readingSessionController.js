import {
  createReadingSessionService,
  getAllReadingSessionsService,
  getReadingSessionByIdService,
  updateReadingSessionService,
  deleteReadingSessionService,
  getStudentReadingStatsService
} from '../services/readingSessionService.js';

/**
 * REST for in-library reading sessions.
 *
 * Split from the old `lateFineReadingController.js` (2026-08-19) — the
 * LateFine controllers it lived alongside were removed because nothing in
 * the app writes that model (see `libraryReports.js` header comment).
 */

// POST /api/library/reading-sessions
export const createReadingSession = async (req, res, next) => {
  try {
    const session = await createReadingSessionService({
      ...req.body,
      registerBy: req.user?._id || null
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
};

// GET /api/library/reading-sessions?st_id=&book_id=&status=&page=&limit=
export const getReadingSessions = async (req, res, next) => {
  try {
    const result = await getAllReadingSessionsService(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/library/reading-sessions/:id
export const getReadingSessionById = async (req, res, next) => {
  try {
    const session = await getReadingSessionByIdService(req.params.id);
    res.status(200).json({ success: true, data: session });
  } catch (err) { next(err); }
};

// PUT /api/library/reading-sessions/:id
export const updateReadingSession = async (req, res, next) => {
  try {
    const session = await updateReadingSessionService(req.params.id, {
      ...req.body,
      updateBy: req.user?._id || null
    });
    res.status(200).json({ success: true, data: session });
  } catch (err) { next(err); }
};

// DELETE /api/library/reading-sessions/:id
export const deleteReadingSession = async (req, res, next) => {
  try {
    const result = await deleteReadingSessionService(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/library/reading-sessions/student/:studentId
export const getStudentReadingStats = async (req, res, next) => {
  try {
    const result = await getStudentReadingStatsService(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
