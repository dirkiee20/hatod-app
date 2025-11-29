import { HttpError } from '../utils/httpError.js';

export const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  const status = err instanceof HttpError ? err.statusCode : 500;
  const message =
    err instanceof HttpError ? err.message : 'Internal server error';
  const response = {
    status: 'error',
    message
  };

  if (err.details) {
    response.details = err.details;
  }

  // In development or if explicitly enabled, show more error details
  if (process.env.NODE_ENV !== 'production' || process.env.SHOW_ERROR_DETAILS === 'true') {
    response.stack = err.stack;
    // Include original error message if available
    if (err.originalError) {
      response.originalError = err.originalError.message;
    }
  }

  // Add CORS headers for error responses
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');

  console.error(err);
  res.status(status).json(response);
};

