import Scholarship from '../models/Scholarship.js';
import ScholarshipType from '../models/ScholarshipType.js';
import DiscountType from '../models/DiscountType.js';

export const createScholarship = async (req, res) => {
  try {
    const { scholarship_id, scholar_type_no, discount_type_id, discount_value, description, is_active } = req.body;

    // Check duplicate
    const existing = await Scholarship.findOne({ scholarship_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Scholarship ID already exists' });
    }

    // Verify references
    const [scholarshipType, discountType] = await Promise.all([
      ScholarshipType.findById(scholar_type_no),
      DiscountType.findById(discount_type_id)
    ]);

    if (!scholarshipType) {
      return res.status(404).json({ success: false, message: 'Scholarship Type reference not found' });
    }
    if (!discountType) {
      return res.status(404).json({ success: false, message: 'Discount Type reference not found' });
    }

    const newScholarship = await Scholarship.create({
      scholarship_id,
      scholar_type_no,
      discount_type_id,
      discount_value,
      description,
      is_active,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    const populated = await Scholarship.findById(newScholarship._id)
      .populate('scholar_type_no')
      .populate('discount_type_id');

    res.status(201).json({ success: true, message: 'Scholarship configured successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.find()
      .populate('scholar_type_no')
      .populate('discount_type_id')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: scholarships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScholarshipById = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id)
      .populate('scholar_type_no')
      .populate('discount_type_id');

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
    res.status(200).json({ success: true, data: scholarship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    // Verify references if they are being updated
    const { scholar_type_no, discount_type_id } = req.body;
    if (scholar_type_no && scholar_type_no !== scholarship.scholar_type_no.toString()) {
      const exists = await ScholarshipType.findById(scholar_type_no);
      if (!exists) return res.status(404).json({ success: false, message: 'Scholarship Type reference not found' });
    }
    if (discount_type_id && discount_type_id !== scholarship.discount_type_id.toString()) {
      const exists = await DiscountType.findById(discount_type_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Discount Type reference not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await Scholarship.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('scholar_type_no')
      .populate('discount_type_id');

    res.status(200).json({ success: true, message: 'Scholarship updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteScholarship = async (req, res) => {
  try {
    const deleted = await Scholarship.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
    res.status(200).json({ success: true, message: 'Scholarship deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
