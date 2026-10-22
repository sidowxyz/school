import AppliesTo from '../models/AppliesTo.js';

export const createAppliesTo = async (req, res) => {
  try {
    const { applies_to_id, applies_to_name, description } = req.body;

    const existing = await AppliesTo.findOne({ applies_to_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Applies To ID already exists' });
    }

    const newAppliesTo = await AppliesTo.create({
      applies_to_id,
      applies_to_name,
      description,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    res.status(201).json({ success: true, message: 'Applies To entity created successfully', data: newAppliesTo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppliesTos = async (req, res) => {
  try {
    const appliesTos = await AppliesTo.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: appliesTos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppliesToById = async (req, res) => {
  try {
    const appliesTo = await AppliesTo.findById(req.params.id);
    if (!appliesTo) {
      return res.status(404).json({ success: false, message: 'Applies To entity not found' });
    }
    res.status(200).json({ success: true, data: appliesTo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppliesTo = async (req, res) => {
  try {
    const appliesTo = await AppliesTo.findById(req.params.id);
    if (!appliesTo) {
      return res.status(404).json({ success: false, message: 'Applies To entity not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await AppliesTo.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Applies To entity updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAppliesTo = async (req, res) => {
  try {
    const deleted = await AppliesTo.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Applies To entity not found' });
    }
    res.status(200).json({ success: true, message: 'Applies To entity deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
