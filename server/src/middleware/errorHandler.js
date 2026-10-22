import AppError from '../utils/AppError.js';

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Prefer the driver-parsed keyValue object over regex-scraping errmsg — the
  // regex only matched quoted strings, so a duplicate on a null/numeric field
  // (e.g. a stale index on a field no longer used) had no match and crashed
  // the error handler itself instead of returning a 400.
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
  const value = err.keyValue ? err.keyValue[field] : (err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] ?? 'duplicate value');
  const message = field
    ? `Duplicate value for ${field}: ${value}. Please use another value!`
    : `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleZodError = (err) => {
  const errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  const message = `Validation failed. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

export const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Check against `err` directly — Mongoose sets `.name` (CastError, ValidationError, ...)
  // on the error's prototype, not as an own property, so a shallow-cloned plain object
  // would always read `.name` as undefined and never match any of these branches.
  let error = err;

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'ZodError') error = handleZodError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    res.status(error.statusCode).json({
      success: false,
      status: error.status,
      error,
      message: error.message,
      stack: error.stack,
    });
  } else {
    // Production
    if (error.isOperational) {
      res.status(error.statusCode).json({
        success: false,
        status: error.status,
        message: error.message,
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went very wrong!',
      });
    }
  }
};
