import FeeType from '../models/FeeType.js';

export const createFeeType = async (req, res) => {
  try {
    const { fee_type_no, fee_name } = req.body;
    
    // Check if duplicate
    const existing = await FeeType.findOne({ fee_type_no });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Fee type number already exists' });
    }

    const newFeeType = await FeeType.create({
      fee_type_no,
      fee_name,
      registerDate: new Date()
    });

    res.status(201).json({ success: true, message: 'Fee Type created successfully', data: newFeeType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeTypes = async (req, res) => {
  try {
    const feeTypes = await FeeType.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: feeTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeTypeById = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);
    if (!feeType) {
      return res.status(404).json({ success: false, message: 'Fee Type not found' });
    }
    res.status(200).json({ success: true, data: feeType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);
    if (!feeType) {
      return res.status(404).json({ success: false, message: 'Fee Type not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await FeeType.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Fee Type updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFeeType = async (req, res) => {
  try {
    const deleted = await FeeType.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Fee Type not found' });
    }
    res.status(200).json({ success: true, message: 'Fee Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
