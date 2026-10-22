import FiscalYear from '../models/FiscalYear.js';
import AccountingPeriod from '../models/AccountingPeriod.js';

// ─── FISCAL YEARS ─────────────────────────────────────────────────────────────
export const getFiscalYears = async (req, res) => {
  try {
    const years = await FiscalYear.find().sort({ startDate: -1 });
    res.json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFiscalYear = async (req, res) => {
  try {
    // Ensure no other Open fiscal year overlaps
    const { startDate, endDate } = req.body;
    const overlap = await FiscalYear.findOne({
      status: 'Open',
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: `Date range overlaps with existing fiscal year: ${overlap.yearName}` });
    }
    const year = await FiscalYear.create(req.body);
    res.status(201).json({ success: true, data: year });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const closeFiscalYear = async (req, res) => {
  try {
    const year = await FiscalYear.findById(req.params.id);
    if (!year) return res.status(404).json({ success: false, message: 'Fiscal year not found' });
    if (year.status === 'Closed') return res.status(400).json({ success: false, message: 'Already closed' });

    // Close all open periods in this year first
    await AccountingPeriod.updateMany({ fiscalYearId: year._id, status: 'Open' }, { status: 'Closed', closedAt: new Date(), closedBy: req.user._id });

    year.status = 'Closed';
    year.closedAt = new Date();
    year.closedBy = req.user._id;
    await year.save();

    res.json({ success: true, data: year, message: `Fiscal year "${year.yearName}" closed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ACCOUNTING PERIODS ───────────────────────────────────────────────────────
export const getAccountingPeriods = async (req, res) => {
  try {
    const { fiscalYearId } = req.query;
    const filter = fiscalYearId ? { fiscalYearId } : {};
    const periods = await AccountingPeriod.find(filter)
      .populate('fiscalYearId', 'yearName status')
      .sort({ startDate: 1 });
    res.json({ success: true, data: periods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccountingPeriod = async (req, res) => {
  try {
    const period = await AccountingPeriod.create(req.body);
    res.status(201).json({ success: true, data: period });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const closeAccountingPeriod = async (req, res) => {
  try {
    const period = await AccountingPeriod.findById(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Period not found' });
    if (period.status === 'Closed') return res.status(400).json({ success: false, message: 'Already closed' });

    period.status = 'Closed';
    period.closedAt = new Date();
    period.closedBy = req.user._id;
    await period.save();

    res.json({ success: true, data: period, message: `Period "${period.periodName}" closed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
