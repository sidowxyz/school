import FeeStructure from '../models/FeeStructure.js';

export const createFeeStructure = async (req, res) => {
  try {
    const { fee_struc_no, fee_type_no, lev_no, y_no, amount } = req.body;

    // Check if fee structure number already exists
    const existingNo = await FeeStructure.findOne({ fee_struc_no });
    if (existingNo) {
      return res.status(400).json({ success: false, message: 'Fee structure number already exists' });
    }

    // Check if configuration already exists for this fee type, level, and academic year
    const existingConfig = await FeeStructure.findOne({ fee_type_no, lev_no, y_no });
    if (existingConfig) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fee configuration already exists for this Fee Type, Level, and Year combination' 
      });
    }

    const newFeeStructure = await FeeStructure.create({
      fee_struc_no,
      fee_type_no,
      lev_no,
      y_no,
      amount,
      registerDate: new Date()
    });

    // Populate references for the response
    const populated = await FeeStructure.findById(newFeeStructure._id)
      .populate('fee_type_no')
      .populate('lev_no')
      .populate('y_no');

    res.status(201).json({ 
      success: true, 
      message: 'Fee Structure configured successfully', 
      data: populated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeStructures = async (req, res) => {
  try {
    const structures = await FeeStructure.find()
      .populate('fee_type_no')
      .populate('lev_no')
      .populate('y_no')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeStructureById = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id)
      .populate('fee_type_no')
      .populate('lev_no')
      .populate('y_no');

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee Structure not found' });
    }

    res.status(200).json({ success: true, data: structure });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeeStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee Structure not found' });
    }

    // Check uniqueness constraint if combinations are updated
    const { fee_type_no, lev_no, y_no } = req.body;
    if (
      (fee_type_no && fee_type_no !== structure.fee_type_no.toString()) ||
      (lev_no && lev_no !== structure.lev_no.toString()) ||
      (y_no && y_no !== structure.y_no.toString())
    ) {
      const checkType = fee_type_no || structure.fee_type_no;
      const checkLevel = lev_no || structure.lev_no;
      const checkYear = y_no || structure.y_no;

      const existingConfig = await FeeStructure.findOne({ 
        _id: { $ne: req.params.id },
        fee_type_no: checkType,
        lev_no: checkLevel,
        y_no: checkYear
      });

      if (existingConfig) {
        return res.status(400).json({ 
          success: false, 
          message: 'Fee configuration already exists for this Fee Type, Level, and Year combination' 
        });
      }
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await FeeStructure.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('fee_type_no')
      .populate('lev_no')
      .populate('y_no');

    res.status(200).json({ success: true, message: 'Fee Structure updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFeeStructure = async (req, res) => {
  try {
    const deleted = await FeeStructure.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Fee Structure not found' });
    }
    res.status(200).json({ success: true, message: 'Fee Structure deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
