const ApiError = require('@/utils/apiError');

const validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    const dataToValidate = req[property];
    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          if (issue.code === 'unrecognized_keys') {
            const keys = issue.keys?.join(', ') || 'Unknown field';
            return `Unknown field(s): ${keys} not allowed`;
          }
          return issue.message || `Invalid ${issue.path?.join('.') || 'input'}`;
        })
        .join(', ');

      return next(new ApiError(message || 'Validation failed', 400));
    }
    req[property] = result.data;
    next();
  };

module.exports = { validate };
