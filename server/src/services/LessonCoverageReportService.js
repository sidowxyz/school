import CourseClass from '../models/CourseClass.js';
import Syllabus from '../models/Syllabus.js';
import LessonCoverage from '../models/LessonCoverage.js';

export const getLessonCoverageReport = async (classId) => {
  const courseClass = await CourseClass.findById(classId)
    .populate('stf_no')
    .populate('cl_no')
    .populate('sub_no')
    .populate('y_no');

  if (!courseClass) {
    throw new Error('Course class not found');
  }

  // Find all syllabus topics for the subject of this class
  const syllabusTopics = await Syllabus.find({ sub_no: courseClass.sub_no });

  // Find all lesson coverage entries for this class
  const coverages = await LessonCoverage.find({ cc_no: classId });

  // Map coverage for easy lookup by syllabus ID
  const coverageMap = {};
  coverages.forEach((cov) => {
    coverageMap[cov.syllabus_no.toString()] = cov;
  });

  const detailedTopics = syllabusTopics.map((topic) => {
    const coverageInfo = coverageMap[topic._id.toString()];
    return {
      syllabus_id: topic._id,
      topic: topic.topic,
      chapter: topic.chapter,
      covered: !!coverageInfo,
      date_covered: coverageInfo ? coverageInfo.date_covered : null,
      periods_covered: coverageInfo ? coverageInfo.periods_covered : 0,
      remarks: coverageInfo ? coverageInfo.remarks : '',
    };
  });

  const totalTopics = syllabusTopics.length;
  const coveredTopics = detailedTopics.filter((t) => t.covered).length;
  const coveragePercentage = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

  return {
    classInfo: {
      id: courseClass._id,
      cc_no: courseClass.cc_no,
      class: courseClass.cl_no,
      subject: courseClass.sub_no,
      teacher: courseClass.stf_no,
      year: courseClass.y_no,
      no_periods: courseClass.no_periods,
    },
    summary: {
      totalTopics,
      coveredTopics,
      coveragePercentage,
    },
    topics: detailedTopics,
  };
};
