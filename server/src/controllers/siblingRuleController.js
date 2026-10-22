import SiblingRule from '../models/SiblingRule.js';
import AppliesTo from '../models/AppliesTo.js';

export const createSiblingRule = async (req, res) => {
  try {
    const { rule_id, rule_name, minimum_siblings, discount_percentage, applies_to_id, description, is_active } = req.body;

    // Check duplicate
    const existing = await SiblingRule.findOne({ rule_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Sibling Rule ID already exists' });
    }

    // Verify reference
    const appliesTo = await AppliesTo.findById(applies_to_id);
    if (!appliesTo) {
      return res.status(404).json({ success: false, message: 'Applies To reference not found' });
    }

    const newRule = await SiblingRule.create({
      rule_id,
      rule_name,
      minimum_siblings,
      discount_percentage,
      applies_to_id,
      description,
      is_active,
      registerDate: new Date(),
      registerBy: req.user ? req.user.name || req.user.id : 'system'
    });

    const populated = await SiblingRule.findById(newRule._id).populate('applies_to_id');

    res.status(201).json({ success: true, message: 'Sibling Rule created successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSiblingRules = async (req, res) => {
  try {
    const rules = await SiblingRule.find().populate('applies_to_id').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSiblingRuleById = async (req, res) => {
  try {
    const rule = await SiblingRule.findById(req.params.id).populate('applies_to_id');
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Sibling Rule not found' });
    }
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSiblingRule = async (req, res) => {
  try {
    const rule = await SiblingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Sibling Rule not found' });
    }

    // Verify references if they are being updated
    const { applies_to_id } = req.body;
    if (applies_to_id && applies_to_id !== rule.applies_to_id.toString()) {
      const exists = await AppliesTo.findById(applies_to_id);
      if (!exists) return res.status(404).json({ success: false, message: 'Applies To reference not found' });
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await SiblingRule.findByIdAndUpdate(req.params.id, updatedData, { new: true }).populate('applies_to_id');

    res.status(200).json({ success: true, message: 'Sibling Rule updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSiblingRule = async (req, res) => {
  try {
    const deleted = await SiblingRule.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Sibling Rule not found' });
    }
    res.status(200).json({ success: true, message: 'Sibling Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
