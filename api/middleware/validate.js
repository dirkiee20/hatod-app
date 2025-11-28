import { validationResult } from 'express-validator';
import { badRequest } from '../utils/httpError.js';

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((error) => ({
    field: error.param,
    message: error.msg
  }));

  return next(badRequest('Validation failed', errors));
};

