import DiscountType from '../models/DiscountType.js';

export const createDiscountType = async (req, res) => {
  try {
    const { discount_type_id, discount_type_name, description } = req.body;

    const existing = await DiscountType.findOne({ discount_type_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Discount Type ID already exists' });
    }

    const newType = await DiscountType.create({
      discount_type_id,
      discount_type_name,
      description,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    res.status(201).json({ success: true, message: 'Discount Type created successfully', data: newType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDiscountTypes = async (req, res) => {
  try {
    const types = await DiscountType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDiscountTypeById = async (req, res) => {
  try {
    const type = await DiscountType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Discount Type not found' });
    }
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDiscountType = async (req, res) => {
  try {
    const type = await DiscountType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Discount Type not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await DiscountType.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Discount Type updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDiscountType = async (req, res) => {
  try {
    const deleted = await DiscountType.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Discount Type not found' });
    }
    res.status(200).json({ success: true, message: 'Discount Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
