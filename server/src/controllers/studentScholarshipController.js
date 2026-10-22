import StudentScholarship from '../models/StudentScholarship.js';
import Student from '../models/Student.js';
import Scholarship from '../models/Scholarship.js';
import ScholarshipType from '../models/ScholarshipType.js';
import DiscountType from '../models/DiscountType.js';
import SiblingRule from '../models/SiblingRule.js';
import Status from '../models/Status.js';

// Convenience endpoint for the Finance UI's "Add Scholarship" modal: the client
// sends plain fields instead of pre-creating ScholarshipType/DiscountType/
// Scholarship/Status rows and wiring up their ObjectIds by hand. Everything is
// find-or-created by name, then a StudentScholarship assignment is created
// exactly as createStudentScholarship would, including its "one active
// scholarship per student" guard.
export const grantScholarship = async (req, res) => {
  try {
    const { studentId, scholarshipTypeName, discountPercentage, validFrom, validTo, reason } = req.body;

    if (!studentId || !scholarshipTypeName || discountPercentage === undefined || !validFrom || !validTo) {
      return res.status(400).json({ success: false, message: 'studentId, scholarshipTypeName, discountPercentage, validFrom and validTo are required' });
    }

    const student = await Student.findOne({ _id: studentId, isDeleted: false });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const activeStatus = await Status.findOneAndUpdate(
      { st_name: 'Active' },
      { $setOnInsert: { st_no: 'S-ACTIVE' } },
      { new: true, upsert: true }
    );

    const duplicateActive = await StudentScholarship.findOne({ st_no: studentId, status_no: activeStatus._id });
    if (duplicateActive) {
      return res.status(400).json({
        success: false,
        message: 'An active scholarship or sibling rule assignment already exists for this student'
      });
    }

    const scholarshipType = await ScholarshipType.findOneAndUpdate(
      { scholarship_name: scholarshipTypeName },
      { $setOnInsert: { schola_type_no: `ST-${Date.now()}` } },
      { new: true, upsert: true }
    );

    const discountType = await DiscountType.findOneAndUpdate(
      { discount_type_name: 'Percentage' },
      { $setOnInsert: { discount_type_id: 'DT-PERCENTAGE', description: 'A flat percentage taken off the invoice amount' } },
      { new: true, upsert: true }
    );

    const scholarship = await Scholarship.findOneAndUpdate(
      { scholar_type_no: scholarshipType._id, discount_type_id: discountType._id, discount_value: discountPercentage },
      { $setOnInsert: { scholarship_id: `SCH-${Date.now()}`, description: reason, is_active: true } },
      { new: true, upsert: true }
    );

    const newAssignment = await StudentScholarship.create({
      student_scholarship_id: `SSCH-${Date.now()}`,
      st_no: studentId,
      scholarship_id: scholarship._id,
      startDate: new Date(validFrom),
      endDate: new Date(validTo),
      status_no: activeStatus._id,
      remarks: reason,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    const populated = await StudentScholarship.findById(newAssignment._id)
      .populate('st_no', 'firstName lastName admissionNumber classId')
      .populate('status_no')
      .populate({
        path: 'scholarship_id',
        populate: ['scholar_type_no', 'discount_type_id']
      });

    res.status(201).json({ success: true, message: 'Scholarship granted successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStudentScholarship = async (req, res) => {
  try {
    const { student_scholarship_id, st_no, scholarship_id, rule_id, startDate, endDate, status_no, remarks } = req.body;

    // Check duplicate assignment number
    const existing = await StudentScholarship.findOne({ student_scholarship_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student scholarship assignment ID already exists' });
    }

    // Verify student, status, and scholarship/rule reference existence
    const [studentExists, statusExists] = await Promise.all([
      Student.findById(st_no),
      Status.findById(status_no)
    ]);

    if (!studentExists) {
      return res.status(404).json({ success: false, message: 'Student reference not found' });
    }
    if (!statusExists) {
      return res.status(404).json({ success: false, message: 'Status reference not found' });
    }

    if (scholarship_id) {
      const exists = await Scholarship.findById(scholarship_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Scholarship reference not found' });
    }
    if (rule_id) {
      const exists = await SiblingRule.findById(rule_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Sibling Rule reference not found' });
    }

    // Business Rule: Prevent duplicate active assignments for the same student.
    // If the status we are assigning is 'Active' (usually 'S1' or 'Active' in database)
    const activeStatus = await Status.findOne({ st_name: 'Active' });
    if (activeStatus && status_no === activeStatus._id.toString()) {
      const duplicateActive = await StudentScholarship.findOne({
        st_no,
        status_no: activeStatus._id
      });
      if (duplicateActive) {
        return res.status(400).json({
          success: false,
          message: 'An active scholarship or sibling rule assignment already exists for this student'
        });
      }
    }

    const newAssignment = await StudentScholarship.create({
      student_scholarship_id,
      st_no,
      scholarship_id,
      rule_id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status_no,
      remarks,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    const populated = await StudentScholarship.findById(newAssignment._id)
      .populate('st_no', 'firstName lastName admissionNumber')
      .populate('status_no')
      .populate({
        path: 'scholarship_id',
        populate: ['scholar_type_no', 'discount_type_id']
      })
      .populate({
        path: 'rule_id',
        populate: ['applies_to_id']
      });

    res.status(201).json({ success: true, message: 'Student scholarship assigned successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentScholarships = async (req, res) => {
  try {
    const assignments = await StudentScholarship.find()
      .populate('st_no', 'firstName lastName admissionNumber')
      .populate('status_no')
      .populate({
        path: 'scholarship_id',
        populate: ['scholar_type_no', 'discount_type_id']
      })
      .populate({
        path: 'rule_id',
        populate: ['applies_to_id']
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentScholarshipById = async (req, res) => {
  try {
    const assignment = await StudentScholarship.findById(req.params.id)
      .populate('st_no', 'firstName lastName admissionNumber')
      .populate('status_no')
      .populate({
        path: 'scholarship_id',
        populate: ['scholar_type_no', 'discount_type_id']
      })
      .populate({
        path: 'rule_id',
        populate: ['applies_to_id']
      });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Student scholarship assignment not found' });
    }
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentScholarship = async (req, res) => {
  try {
    const assignment = await StudentScholarship.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Student scholarship assignment not found' });
    }

    // Verify reference existence if changed
    const { st_no, scholarship_id, rule_id, status_no } = req.body;
    if (st_no && st_no !== assignment.st_no.toString()) {
      const exists = await Student.findById(st_no);
      if (!exists) return res.status(404).json({ success: false, message: 'Student reference not found' });
    }
    if (status_no && status_no !== assignment.status_no.toString()) {
      const exists = await Status.findById(status_no);
      if (!exists) return res.status(404).json({ success: false, message: 'Status reference not found' });
    }
    if (scholarship_id && scholarship_id !== (assignment.scholarship_id || '').toString()) {
      const exists = await Scholarship.findById(scholarship_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Scholarship reference not found' });
    }
    if (rule_id && rule_id !== (assignment.rule_id || '').toString()) {
      const exists = await SiblingRule.findById(rule_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Sibling Rule reference not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    if (req.body.startDate) updatedData.startDate = new Date(req.body.startDate);
    if (req.body.endDate) updatedData.endDate = new Date(req.body.endDate);

    const updated = await StudentScholarship.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('st_no', 'firstName lastName admissionNumber')
      .populate('status_no')
      .populate({
        path: 'scholarship_id',
        populate: ['scholar_type_no', 'discount_type_id']
      })
      .populate({
        path: 'rule_id',
        populate: ['applies_to_id']
      });

    res.status(200).json({ success: true, message: 'Student scholarship assignment updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudentScholarship = async (req, res) => {
  try {
    const deleted = await StudentScholarship.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Student scholarship assignment not found' });
    }
    res.status(200).json({ success: true, message: 'Student scholarship assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
