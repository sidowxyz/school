import PaymentMethod from '../models/PaymentMethod.js';

export const createPaymentMethod = async (req, res) => {
  try {
    const { payment_method_no, payment_method_name } = req.body;

    const existing = await PaymentMethod.findOne({ payment_method_no });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payment method number already exists' });
    }

    const newPaymentMethod = await PaymentMethod.create({
      payment_method_no,
      payment_method_name,
      registerDate: new Date()
    });

    res.status(201).json({ success: true, message: 'Payment Method created successfully', data: newPaymentMethod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentMethodById = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment Method not found' });
    }
    res.status(200).json({ success: true, data: method });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment Method not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await PaymentMethod.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ success: true, message: 'Payment Method updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const deleted = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payment Method not found' });
    }
    res.status(200).json({ success: true, message: 'Payment Method deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
