import * as markService from '../services/markService.js';
import Student from '../models/Student.js';

/**
 * @desc    Geli dhibcaha fasal dhan hal mar (Bulk Entry)
 * @route   POST /api/marks/bulk
 * @access  Private (Teacher Only) -> Waxaa maamulaya authorize('teacher')
 */
export const createBulkMarks = async (req, res) => {
  try {
    const teacherId = req.user.id; 

    // Wuxuu si toos ah u wacayaa enterBulkMarksService ee ku dhex jira markService
    const marks = await markService.enterBulkMarksService(req.body, teacherId);

    res.status(200).json({
      success: true,
      message: `${marks.length} Arday dhibcohoodi si guul leh ayaa loo kaydiyey.`,
      data: marks
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Geli dhibcaha hal arday (Single Entry)
 * @route   POST /api/marks
 * @access  Private (Teacher Only) -> Waxaa maamulaya authorize('teacher')
 */
export const createStudentMark = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // SAXID: Waxaan u beddelnay enterMarkService si uu u waafaqo magaca adeeggaaga dhabta ah
    const mark = await markService.enterMarkService(req.body, teacherId);

    res.status(201).json({
      success: true,
      message: "Dhibcaha ardayga si guul leh ayaa loo kaydiyey.",
      data: mark
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Soo saar natiijada ardayga (Get Student Results)
 * @route   GET /api/marks/student/:studentId
 * @access  Private (Admin, Teacher, Student) -> Waxaa maamulaya authorize
 */
export const getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;

    // IDOR guard: a 'student' may only read their OWN results. Admin/teacher
    // may read any student. Prevents student A from reading student B's marks
    // by passing an arbitrary :studentId.
    if (req.user.role === 'student') {
      const ownStudent = await Student.findOne({ _id: studentId, userId: req.user.id });
      if (!ownStudent) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view these results'
        });
      }
    }

    // SAXID: Maadaama getStudentResultsService uu u baahan yahay academicYearId,
    // waxaan ka soo dhuuqaynaa Query-ga URL-ka si uusan koodhku u naaqusin.
    const { academicYearId } = req.query;

    if (!academicYearId) {
      return res.status(400).json({
        success: false,
        message: "Fadlan soo raaci academicYearId adoo isticmaalaya query (?academicYearId=...)"
      });
    }

    // Wuxuu u gudbinayaa labadii parameter ee uu adeeggu u baahnaa
    const results = await markService.getStudentResultsService(studentId, academicYearId);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};