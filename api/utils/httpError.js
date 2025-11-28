export class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
    Error.captureStackTrace?.(this, HttpError);
  }
}

export const notFound = (message = 'Resource not found') =>
  new HttpError(404, message);

export const badRequest = (message = 'Bad request', details) =>
  new HttpError(400, message, details);

export const unauthorized = (message = 'Unauthorized') =>
  new HttpError(401, message);

export const forbidden = (message = 'Forbidden') =>
  new HttpError(403, message);

export const conflict = (message = 'Conflict') =>
  new HttpError(409, message);

export const internal = (message = 'Internal server error', details) =>
  new HttpError(500, message, details);

