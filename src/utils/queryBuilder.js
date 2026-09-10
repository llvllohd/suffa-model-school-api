const buildFilter = (q, isAdmin = false) => {
  const filter = {};
  if (!isAdmin) filter.isActive = true;
  else if (q.isActive !== undefined) filter.isActive = q.isActive;

  if (q.city) filter['location.city'] = q.city;

  // Handles both?capacity=200 and?capacity[gte]=100&capacity[lte]=500
  if (q.capacity !== undefined) {
    if (typeof q.capacity === 'number') {
      filter.capacity = { $gte: q.capacity };
    } else {
      filter.capacity = {};
      if (q.capacity.gte !== undefined) filter.capacity.$gte = q.capacity.gte;
      if (q.capacity.gt !== undefined) filter.capacity.$gt = q.capacity.gt;
      if (q.capacity.lte !== undefined) filter.capacity.$lte = q.capacity.lte;
      if (q.capacity.lt !== undefined) filter.capacity.$lt = q.capacity.lt;
    }
  }

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.pricePerDay = {};
    if (q.minPrice !== undefined) filter.pricePerDay.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.pricePerDay.$lte = q.maxPrice;
  }

  return filter;
};

const buildSearch = (search, fields = ['name', 'location.city']) => {
  if (!search) return null;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  return { $or: fields.map((f) => ({ [f]: regex })) };
};

module.exports = { buildFilter, buildSearch };
