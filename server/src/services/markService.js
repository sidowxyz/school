import Mark from '../models/mark.js';
import Student from '../models/Student.js';
// Kor uga soo jiido grading engine-ka si toos ah
import { calculateGrade } from '../utils/gradingEngine.js';

/**
 * @desc 1. Gelinta dhibco cusub (Single Entry)
 */
export const enterMarkService = async (markData, teacherId) => {
  const { student, subject, academicYear, term, caMarks, examMarks } = markData;

  // Hubi in ardaygu jiro, uuna ammaan yahay (Not Deleted)
  const studentExists = await Student.findOne({ _id: student, isDeleted: false });
  if (!studentExists) {
    throw new Error('Ardaygan lagama helin nidaamka dhexdiisa ama waa la masaxay.');
  }

  // Grade-ka, remarks-ka iyo totalMarks waxaa xisaabiya pre('validate') hook-ga Mark model-ka.
  const mark = await Mark.create({
    student,
    subject,
    academicYear,
    term,
    caMarks,
    examMarks,
    teacher: teacherId
  });

  return mark;
};

/**
 * @desc 2. Gelinta Dhibcaha Fasalka Dhan Hal Mar (Bulk Marks Entry)
 */
export const enterBulkMarksService = async (bulkData, teacherId) => {
  const { subject, academicYear, term, marksArray } = bulkData; 
  // marksArray format: [{ student: "ID", caMarks: 30, examMarks: 50 }, ...]

  if (!marksArray || marksArray.length === 0) {
    throw new Error('Fariinta dhibcaha ee aad soo dirtay waa maran tahay.');
  }

  const savedMarks = [];

  // Loop ku mari dhamaan ardayda dhibcaha loo weyneynayo
  for (const item of marksArray) {
    
    // findOneAndUpdate ma shaqaaleysiiyo pre('validate') hook-ga, sidaas darteed grade-ka,
    // remarks-ka iyo totalMarks waa in halkan lagu xisaabiyaa.
    const { grade, remarks } = calculateGrade(item.caMarks, item.examMarks);
    const totalMarks = Number(item.caMarks) + Number(item.examMarks);

    // Isticmaal Upsert (Haddii dhibcuhu hore u jireen waa la beddelayaa, haddi kalena waa la abuurayaa)
    const updatedMark = await Mark.findOneAndUpdate(
      { student: item.student, subject, term, academicYear },
      {
        $set: {
          caMarks: item.caMarks,
          examMarks: item.examMarks,
          totalMarks,
          grade,
          remarks,
          teacher: teacherId
        }
      },
      { new: true, upsert: true, runValidators: true }
    );
    savedMarks.push(updatedMark);
  }

  return savedMarks;
};

/**
 * @desc 3. Soo saarista natiijada (Result Sheet) ee hal arday
 */
export const getStudentResultsService = async (studentId, academicYearId) => {
  const results = await Mark.find({ student: studentId, academicYear: academicYearId })
    .populate('subject')
    .populate('term')
    .sort({ createdAt: 1 });
    
  return results;
};