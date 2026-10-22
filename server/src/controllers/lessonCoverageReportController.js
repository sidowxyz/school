import * as LessonCoverageReportService from '../services/LessonCoverageReportService.js';

export const getLessonCoverageReport = async (req, res, next) => {
  try {
    const report = await LessonCoverageReportService.getLessonCoverageReport(req.params.classId);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};
