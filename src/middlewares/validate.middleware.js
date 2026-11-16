const ApiError = require('@/utils/apiError');

const formatZodError = (issue, source) => {
  const field = issue.path.join('.') || source;

  if (issue.code === 'unrecognized_keys') {
    return { field: source, message: `Unknown field(s): ${issue.keys.join(', ')} not allowed` };
  }

  return { field, message: issue.message };
};

// source: 'body' (default) | 'params' | 'query'
// Backward compatible - Old calls validate(schema) still = body
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const data = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
    const result = schema.safeParse(data);

    if (!result.success) {
      const seen = new Map();

      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || source;
        const existing = seen.get(field);

        if (!existing) {
          seen.set(field, issue);
          continue;
        }

        // If we already have a custom "required" from superRefine,
        // but now we see a real invalid_type, replace it.
        // Example: rollNo: 50001 -> custom "required" gets replaced by "must be a string"
        if (existing.code === 'custom' && issue.code !== 'custom') {
          seen.set(field, issue);
        }
      }

      const errors = [...seen.values()].map((issue) => formatZodError(issue, source));
      return next(new ApiError(errors[0].message, 400, errors));
    }

    // ✅ Write back cleaned data - Object.assign works on Express 4 + 5
    if (source === 'params') Object.assign(req.params, result.data);
    else if (source === 'query') Object.assign(req.query, result.data);
    else req.body = result.data;
    next();
  };

module.exports = { validate };
