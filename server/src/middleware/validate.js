export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    // The first problem, in words the person can act on; all of them in errors[].
    const first = error.errors?.[0];
    return res.status(400).json({
      success: false,
      message: first?.message && first.message !== 'Required' ? first.message : `Validation failed${first ? `: ${first.path.join('.')} is required` : ''}`,
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
};
