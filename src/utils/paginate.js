const paginate = async (model, filter, { page, limit, sort = { createdAt: -1 }, populate, select } = {}) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100);
  const query = model.find(filter).sort(sort).skip((safePage - 1) * safeLimit).limit(safeLimit);
  if (populate) query.populate(populate);
  if (select) query.select(select);
  const [data, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
  return { data, total, page: safePage, pages: Math.ceil(total / safeLimit), limit: safeLimit };
};

module.exports = paginate;
