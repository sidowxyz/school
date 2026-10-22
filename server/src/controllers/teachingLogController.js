import TeachingLog from '../models/TeachingLog.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper: generate unique sequential log number
const generateLogNo = async () => {
  const lastLog = await TeachingLog.findOne().sort({ createdAt: -1 });
  if (!lastLog || !lastLog.logNo) return 'TLOG-001';
  const match = lastLog.logNo.match(/TLOG-(\d+)/);
  if (match) {
    return `TLOG-${String(parseInt(match[1], 10) + 1).padStart(3, '0')}`;
  }
  const count = await TeachingLog.countDocuments();
  return `TLOG-${String(count + 1).padStart(3, '0')}`;
};

const populateTeacher = (query) =>
  query.populate({
    path: 'teacherId',
    select: 'staffId',
    populate: { path: 'userId', select: 'firstName lastName email' }
  });

// Shapes a populated log doc to match what the client's TeachingLog type expects,
// deriving `createdBy` from the linked Teacher -> User rather than storing it redundantly.
const toApiShape = (log) => {
  const obj = log.toObject();
  const teacherUser = obj.teacherId?.userId;
  return {
    _id: obj._id,
    assignmentId: obj.assignmentId?.toString(),
    periodId: obj.periodId?.toString(),
    date: obj.date,
    subject: obj.subject,
    classId: obj.classId,
    section: obj.section,
    period: obj.period,
    topicTaught: obj.topicTaught,
    lessonObjective: obj.lessonObjective,
    teachingSummary: obj.teachingSummary,
    learningOutcomes: obj.learningOutcomes,
    studentParticipation: obj.studentParticipation,
    challengesFaced: obj.challengesFaced,
    extraNotes: obj.extraNotes,
    homeworkGiven: obj.homeworkGiven,
    submissionDeadline: obj.submissionDeadline,
    status: obj.status,
    createdBy: teacherUser
      ? { name: [teacherUser.firstName, teacherUser.lastName].filter(Boolean).join(' '), email: teacherUser.email }
      : undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const findOwnTeacher = (req) => Teacher.findOne({ userId: req.user._id });

const resolveAssignedSession = async ({ teacherId, assignmentId, periodId, date }) => {
  if (!assignmentId || !periodId) {
    throw new AppError('An assigned class and scheduled period are required.', 400);
  }

  const assignment = await TeacherAssignment.findOne({ _id: assignmentId, teacherId })
    .populate('subjectId', 'sub_name')
    .populate('classId', 'cl_name')
    .populate('sectionId', 'name')
    .populate('timetableSlots.periodId', 'per_name time_in time_out');
  if (!assignment) {
    throw new AppError('This class or subject is not assigned to the logged-in teacher.', 403);
  }

  const formattedDate = new Date(date);
  formattedDate.setUTCHours(0, 0, 0, 0);
  const dayName = WEEKDAY_NAMES[formattedDate.getUTCDay()];
  const slot = assignment.timetableSlots.find(
    (candidate) => candidate.day === dayName && candidate.periodId?._id?.toString() === periodId,
  );
  if (!slot) {
    throw new AppError(`The selected period is not assigned to this teacher on ${dayName}.`, 403);
  }

  return {
    assignment,
    slot,
    formattedDate,
    subject: assignment.subjectId.sub_name,
    classId: assignment.classId.cl_name,
    section: assignment.sectionId.name,
    period: `${slot.periodId.per_name} (${slot.periodId.time_in} - ${slot.periodId.time_out})`,
  };
};

// @desc   Create a new teaching log for the logged-in teacher
// @route  POST /api/teaching-logs
export const createTeachingLog = async (req, res, next) => {
  try {
    const teacher = await findOwnTeacher(req);
    if (!teacher) return next(new AppError('No teacher profile is linked to this account.', 400));

    const {
      date, assignmentId, periodId,
      topicTaught, lessonObjective, teachingSummary, learningOutcomes,
      studentParticipation, challengesFaced, extraNotes,
      homeworkGiven, submissionDeadline, status
    } = req.body;

    const session = await resolveAssignedSession({
      teacherId: teacher._id,
      assignmentId,
      periodId,
      date,
    });

    const existingLog = await TeachingLog.findOne({
      teacherId: teacher._id,
      assignmentId,
      periodId,
      date: session.formattedDate,
    });
    if (existingLog) {
      return next(new AppError('A teaching log already exists for this class, period, and date.', 400));
    }

    const logNo = await generateLogNo();
    const newLog = await TeachingLog.create({
      logNo,
      teacherId: teacher._id,
      assignmentId,
      periodId,
      date: session.formattedDate,
      subject: session.subject,
      classId: session.classId,
      section: session.section,
      period: session.period,
      topicTaught, lessonObjective, teachingSummary, learningOutcomes,
      studentParticipation, challengesFaced, extraNotes,
      homeworkGiven, submissionDeadline: homeworkGiven ? submissionDeadline : undefined,
      status
    });

    const populatedLog = await populateTeacher(TeachingLog.findById(newLog._id));
    return res.status(201).json(new ApiResponse(201, toApiShape(populatedLog), 'Teaching log created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('A teaching log already exists for this class, period, and date.', 400));
    next(error);
  }
};

// @desc   Get teaching logs — a teacher sees only their own, admin sees all
// @route  GET /api/teaching-logs
export const getTeachingLogs = async (req, res, next) => {
  try {
    const { teacherId, search, classId, subject, status, date, page = 1, limit = 10 } = req.query;
    const query = {};

    if (req.user.role === 'teacher') {
      const teacher = await findOwnTeacher(req);
      if (!teacher) return next(new AppError('No teacher profile is linked to this account.', 400));
      query.teacherId = teacher._id;
    } else if (teacherId) {
      if (!/^[0-9a-fA-F]{24}$/.test(teacherId)) {
        return next(new AppError('Invalid teacher id.', 400));
      }
      const teacherExists = await Teacher.exists({ _id: teacherId });
      if (!teacherExists) return next(new AppError('Teacher not found.', 404));
      query.teacherId = teacherId;
    }

    if (classId) query.classId = classId;
    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (date) {
      const parsedDate = new Date(date);
      parsedDate.setUTCHours(0, 0, 0, 0);
      query.date = parsedDate;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ topicTaught: regex }, { lessonObjective: regex }, { subject: regex }];
    }

    const currentPage = parseInt(page);
    const pageSize = parseInt(limit);
    const total = await TeachingLog.countDocuments(query);

    const logs = await populateTeacher(
      TeachingLog.find(query)
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .sort({ date: -1, createdAt: -1 })
    );

    return res.status(200).json(new ApiResponse(200, {
      logs: logs.map(toApiShape),
      total,
      page: currentPage,
      limit: pageSize
    }, 'Teaching logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Get teaching log by ID
// @route  GET /api/teaching-logs/:id
export const getTeachingLogById = async (req, res, next) => {
  try {
    const log = await populateTeacher(TeachingLog.findById(req.params.id));
    if (!log) return next(new AppError('Teaching log not found', 404));

    if (req.user.role === 'teacher') {
      const teacher = await findOwnTeacher(req);
      if (!teacher || log.teacherId?._id?.toString() !== teacher._id.toString()) {
        return next(new AppError('You do not have access to this teaching log.', 403));
      }
    }

    return res.status(200).json(new ApiResponse(200, toApiShape(log), 'Teaching log retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Update teaching log (owning teacher or admin)
// @route  PUT /api/teaching-logs/:id
export const updateTeachingLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await TeachingLog.findById(id);
    if (!log) return next(new AppError('Teaching log not found', 404));

    if (req.user.role === 'teacher') {
      const teacher = await findOwnTeacher(req);
      if (!teacher || log.teacherId.toString() !== teacher._id.toString()) {
        return next(new AppError('You do not have access to this teaching log.', 403));
      }
    }

    const {
      date, assignmentId, periodId,
      topicTaught, lessonObjective, teachingSummary, learningOutcomes,
      studentParticipation, challengesFaced, extraNotes,
      homeworkGiven, submissionDeadline, status
    } = req.body;

    const academicSelectionChanged = date !== undefined || assignmentId !== undefined || periodId !== undefined;
    if (academicSelectionChanged) {
      const teacherId = log.teacherId;
      const session = await resolveAssignedSession({
        teacherId,
        assignmentId: assignmentId || log.assignmentId?.toString(),
        periodId: periodId || log.periodId?.toString(),
        date: date || log.date,
      });
      log.assignmentId = session.assignment._id;
      log.periodId = session.slot.periodId._id;
      log.date = session.formattedDate;
      log.subject = session.subject;
      log.classId = session.classId;
      log.section = session.section;
      log.period = session.period;
    }
    if (topicTaught !== undefined) log.topicTaught = topicTaught;
    if (lessonObjective !== undefined) log.lessonObjective = lessonObjective;
    if (teachingSummary !== undefined) log.teachingSummary = teachingSummary;
    if (learningOutcomes !== undefined) log.learningOutcomes = learningOutcomes;
    if (studentParticipation !== undefined) log.studentParticipation = studentParticipation;
    if (challengesFaced !== undefined) log.challengesFaced = challengesFaced;
    if (extraNotes !== undefined) log.extraNotes = extraNotes;
    if (homeworkGiven !== undefined) log.homeworkGiven = homeworkGiven;
    if (submissionDeadline !== undefined) log.submissionDeadline = submissionDeadline;
    if (status !== undefined) log.status = status;

    await log.save();

    const populatedLog = await populateTeacher(TeachingLog.findById(id));
    return res.status(200).json(new ApiResponse(200, toApiShape(populatedLog), 'Teaching log updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('A teaching log already exists for this class, period, and date.', 400));
    next(error);
  }
};

// @desc   Delete teaching log (owning teacher or admin)
// @route  DELETE /api/teaching-logs/:id
export const deleteTeachingLog = async (req, res, next) => {
  try {
    const log = await TeachingLog.findById(req.params.id);
    if (!log) return next(new AppError('Teaching log not found', 404));

    if (req.user.role === 'teacher') {
      const teacher = await findOwnTeacher(req);
      if (!teacher || log.teacherId.toString() !== teacher._id.toString()) {
        return next(new AppError('You do not have access to this teaching log.', 403));
      }
    }

    await TeachingLog.findByIdAndDelete(req.params.id);
    return res.status(200).json(new ApiResponse(200, null, 'Teaching log deleted successfully'));
  } catch (error) {
    next(error);
  }
};
