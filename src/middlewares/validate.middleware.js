const ApiError = require('../utils/apiError');

exports.validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
      return next(new ApiError(message, 400));
    }

    req[property] = value;
    next();
  };
