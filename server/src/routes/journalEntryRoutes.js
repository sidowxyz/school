import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import JournalEntry from '../models/JournalEntry.js';
import JournalLine from '../models/JournalLine.js';

const router = express.Router();

router.use(authenticate);

// GET /api/journal-entries  — list with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, referenceType, startDate, endDate } = req.query;
    const filter = { status: 'Posted' };
    if (referenceType) filter.referenceType = referenceType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }

    const [entries, total] = await Promise.all([
      JournalEntry.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .populate('createdBy', 'firstName lastName'),
      JournalEntry.countDocuments(filter)
    ]);

    res.json({ success: true, data: entries, total, page: +page, limit: +limit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/journal-entries/:id  — single entry with its lines
router.get('/:id', async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!entry) return res.status(404).json({ success: false, message: 'Journal entry not found' });

    const lines = await JournalLine.find({ journalEntryId: entry._id })
      .populate('accountId', 'accountCode accountName type normalBalance')
      .populate('studentId', 'firstName lastName admissionNumber');

    res.json({ success: true, data: { ...entry.toObject(), lines } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
