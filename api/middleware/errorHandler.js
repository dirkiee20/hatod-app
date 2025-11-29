import { HttpError } from '../utils/httpError.js';

export const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  // Prevent sending response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

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
  // Always set CORS headers, even for errors, to prevent connection reset issues
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // If no origin (e.g., mobile app or direct API call), allow all
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // If this is an OPTIONS request, respond immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Log error for debugging
  console.error('Error handler:', {
    message: err.message,
    status,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Ensure response is sent
  try {
    res.status(status).json(response);
  } catch (sendError) {
    console.error('Error sending error response:', sendError);
    // Last resort - try to send a simple text response
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
};

