exports.HALL_UPDATABLE_FIELDS = [
  'name',
  'capacity',
  'pricePerHour',
  'pricePerDay',
  'contactPhone',
  'contactPersonName',
  'amenities',
  'description',
  'location',
  'images',
  'isActive',
];

const ALLOWED_SORT = ['name', 'capacity', 'pricePerHour', 'pricePerDay', 'createdAt', 'rating'];
exports.ALLOWED_SORT = ALLOWED_SORT;

exports.buildFilter = (q, isAdmin = false) => {
  const filter = {};

  if (!isAdmin) {
    filter.isActive = true;
    filter.isVerified = true;
  }

  if (isAdmin) {
    if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';
    if (q.isVerified !== undefined) filter.isVerified = q.isVerified === 'true';
  }

  if (q.city) filter['location.city'] = { $regex: q.city, $options: 'i' };

  if (q.capacity !== undefined) {
    if (typeof q.capacity === 'string' || typeof q.capacity === 'number') {
      const num = Number(q.capacity);
      if (!isNaN(num)) filter.capacity = { $gte: num };
    } else {
      const cap = {};
      if (q.capacity.gte != null && !isNaN(q.capacity.gte)) cap.$gte = Number(q.capacity.gte);
      if (q.capacity.gt != null && !isNaN(q.capacity.gt)) cap.$gt = Number(q.capacity.gt);
      if (q.capacity.lte != null && !isNaN(q.capacity.lte)) cap.$lte = Number(q.capacity.lte);
      if (q.capacity.lt != null && !isNaN(q.capacity.lt)) cap.$lt = Number(q.capacity.lt);
      if (Object.keys(cap).length) filter.capacity = cap;
    }
  }

  if (q.minPrice != null || q.maxPrice != null) {
    const range = {};
    if (q.minPrice != null && !isNaN(q.minPrice)) range.$gte = Number(q.minPrice);
    if (q.maxPrice != null && !isNaN(q.maxPrice)) range.$lte = Number(q.maxPrice);
    if (Object.keys(range).length) {
      filter.pricePerHour = { ...range };
      filter.pricePerDay = { ...range };
    }
  }

  if (q.amenities) {
    const am = q.amenities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (am.length) filter.amenities = { $all: am };
  }

  return filter;
};

exports.buildSearch = (search, fields = ['name', 'location.city']) => {
  if (!search?.trim()) return null;
  if (search.length > 100) search = search.slice(0, 100); // prevent ReDoS on long input
  const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $or: fields.map((f) => ({ [f]: { $regex: escaped, $options: 'i' } })) };
};

exports.buildSort = (sort) => {
  const sortObj = {};
  if (sort) {
    sort.split(',').forEach((f) => {
      let clean = f.trim();
      if (!clean) return;
      const dir = clean.startsWith('-') ? -1 : 1;
      if (clean.startsWith('-')) clean = clean.slice(1);
      if (!clean || !ALLOWED_SORT.includes(clean)) return;
      sortObj[clean] = dir;
    });
  }
  if (!Object.keys(sortObj).length) sortObj.createdAt = -1;
  return sortObj;
};
