/**
 * Express global error handler middleware.
 *
 * Distinguishes between operational errors (trusted, expected) and
 * programmer errors (bugs).  Operational errors are sent with their
 * statusCode; programmer errors are logged and return 500.
 */
function errorHandler(err, req, res, next) {
  if (err.message && err.message.includes('Token verification failed')) {
    return res.status(401).json({ message: 'Invalid Google token. Please try again.' });
  }

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log all errors server-side
  if (!isOperational) {
    console.error('[Error]', err.stack || err.message);
  } else {
    console.warn('[OperationalError]', err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Helper to create operational (expected) errors with a statusCode.
 * Use this in route handlers instead of plain `throw new Error(...)`.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };