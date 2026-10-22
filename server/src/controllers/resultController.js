import * as ResultService from '../services/ResultService.js';

/**
 * POST /api/results
 * Create a new result record
 */
export const createResult = async (req, res, next) => {
  try {
    if (req.user) req.body.createBy = req.user._id;
    const result = await ResultService.createResult(req.body);
    res.status(201).json({
      success: true,
      message: 'Result created successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/results
 * Get all results with optional filters and pagination
 */
export const getAllResults = async (req, res, next) => {
  try {
    const data = await ResultService.getAllResults(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/results/:id
 * Get a single result by ID
 */
export const getResultById = async (req, res, next) => {
  try {
    const result = await ResultService.getResultById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/results/:id
 * Update a result by ID
 */
export const updateResult = async (req, res, next) => {
  try {
    if (req.user) req.body.updateBy = req.user._id;
    const result = await ResultService.updateResult(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.json({
      success: true,
      message: 'Result updated successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/results/:id
 * Delete a result by ID
 */
export const deleteResult = async (req, res, next) => {
  try {
    const result = await ResultService.deleteResult(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.json({ success: true, message: 'Result deleted successfully' });
  } catch (err) {
    next(err);
  }
};
