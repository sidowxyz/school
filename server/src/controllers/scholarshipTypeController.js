import ScholarshipType from '../models/ScholarshipType.js';

export const createScholarshipType = async (req, res) => {
  try {
    const { schola_type_no, scholarship_name, description } = req.body;

    const existing = await ScholarshipType.findOne({ schola_type_no });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Scholarship Type number already exists' });
    }

    const newType = await ScholarshipType.create({
      schola_type_no,
      scholarship_name,
      description,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    res.status(201).json({ success: true, message: 'Scholarship Type created successfully', data: newType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScholarshipTypes = async (req, res) => {
  try {
    const types = await ScholarshipType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScholarshipTypeById = async (req, res) => {
  try {
    const type = await ScholarshipType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Scholarship Type not found' });
    }
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScholarshipType = async (req, res) => {
  try {
    const type = await ScholarshipType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Scholarship Type not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await ScholarshipType.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Scholarship Type updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteScholarshipType = async (req, res) => {
  try {
    const deleted = await ScholarshipType.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Scholarship Type not found' });
    }
    res.status(200).json({ success: true, message: 'Scholarship Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
