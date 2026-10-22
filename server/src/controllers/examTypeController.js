import ExamType from '../models/ExamType.js';

export const createExamType = async (req, res) => {
  try {
    const { exam_type_no, type_name } = req.body;

    const existing = await ExamType.findOne({ exam_type_no });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Exam type number already exists' });
    }

    const newExamType = await ExamType.create({
      exam_type_no,
      type_name,
      registerDate: new Date()
    });

    res.status(201).json({ success: true, message: 'Exam Type created successfully', data: newExamType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExamTypes = async (req, res) => {
  try {
    const examTypes = await ExamType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: examTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExamTypeById = async (req, res) => {
  try {
    const examType = await ExamType.findById(req.params.id);
    if (!examType) {
      return res.status(404).json({ success: false, message: 'Exam Type not found' });
    }
    res.status(200).json({ success: true, data: examType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExamType = async (req, res) => {
  try {
    const examType = await ExamType.findById(req.params.id);
    if (!examType) {
      return res.status(404).json({ success: false, message: 'Exam Type not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await ExamType.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Exam Type updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExamType = async (req, res) => {
  try {
    const deleted = await ExamType.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Exam Type not found' });
    }
    res.status(200).json({ success: true, message: 'Exam Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
