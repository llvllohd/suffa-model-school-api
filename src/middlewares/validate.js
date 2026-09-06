const ApiError = require('../utils/ApiError');

exports.validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new ApiError(message, 400));
    }

    req[property] = value;
    next();
  };
