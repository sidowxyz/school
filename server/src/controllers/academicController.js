// src/controllers/academicController.js

// FIIRO GAAR AH: Hubi in magacyadan (Year, Term, Class, Section, Subject) ay u qoran yihiin siday u yaalaan folder-ka models!
import Year from '../models/Year.js'; 
import Term from '../models/Term.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';

// ==========================================
// 1. ACADEMIC YEARS MANAGEMENT
// ==========================================
export const createYear = async (req, res) => {
  try {
    const newYear = await Year.create(req.body);
    res.status(201).json({ success: true, message: 'Sanad dugsiyeedka si guul leh ayaa loo abuuray', data: newYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getYears = async (req, res) => {
  try {
    const years = await Year.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. ACADEMIC TERMS MANAGEMENT
// ==========================================
export const createTerm = async (req, res) => {
  try {
    const newTerm = await Term.create(req.body);
    res.status(201).json({ success: true, message: 'Xilliga (Term) si guul leh ayaa loo abuuray', data: newTerm });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTerms = async (req, res) => {
  try {
    const terms = await Term.find().populate('academicYear', 'name status');
    res.status(200).json({ success: true, data: terms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. CLASSES MANAGEMENT (Fasallada)
// ==========================================
export const createClass = async (req, res) => {
  try {
    const newClass = await Class.create(req.body);
    res.status(201).json({ success: true, message: 'Fasalka si guul leh ayaa loo abuuray', data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClasses = async (req, res) => {
  try {
    const classes = await Class.find();
    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. SECTIONS MANAGEMENT (Qaybaha)
// ==========================================
export const createSection = async (req, res) => {
  try {
    const newSection = await Section.create(req.body);
    res.status(201).json({ success: true, message: 'Qaybta fasalka si guul leh ayaa loo abuuray', data: newSection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSections = async (req, res) => {
  try {
    const sections = await Section.find().populate('classId', 'name');
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. SUBJECTS MANAGEMENT (Maadooyinka)
// ==========================================
export const createSubject = async (req, res) => {
  try {
    const newSubject = await Subject.create(req.body);
    res.status(201).json({ success: true, message: 'Maadada si guul leh ayaa loo abuuray', data: newSubject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().populate('classId', 'name');
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};