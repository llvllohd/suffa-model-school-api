// Generic pagination helper
// Works for any model - Allocation, Assignment, Marks, etc.
// Supports populate as object, array, or function

const paginate = async (model, filter = {}, options = {}) => {
  const { page, limit, sort = { createdAt: -1 }, populate, select } = options;

  // Safe page / limit - Prevents NaN, negative, huge limit attacks
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
  const skip = (safePage - 1) * safeLimit;

  const query = model.find(filter).sort(sort).skip(skip).limit(safeLimit);

  // Select - e.g. 'name email' - Optional
  if (select) query.select(select);

  // Populate - Supports 3 forms:
  // 1. Object: { path: 'subjectId', select: 'name' }
  // 2. Array: [{ path: 'subjectId' }, { path: 'classId' }]
  // 3. Function: (query) => query.populate(...).populate(...)
  // Function form is useful when you already have a populate helper like populateAllocation()
  if (populate) {
    if (typeof populate === 'function') {
      populate(query);
    } else if (Array.isArray(populate)) {
      populate.forEach((p) => query.populate(p));
    } else {
      query.populate(populate);
    }
  }

  // Single round trip - data + count in parallel
  const [data, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);

  const pages = Math.ceil(total / safeLimit) || 0;

  return {
    data,
    total,
    page: safePage,
    pages,
    limit: safeLimit,
    hasNextPage: safePage < pages,
    hasPrevPage: safePage > 1,
  };
};

module.exports = paginate;
