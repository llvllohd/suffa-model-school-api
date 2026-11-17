const Subject = require('./subject.model');
const Category = require('../categories/category.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// ✅ Helper - Shared by Create + Update
const validateAndNormalizeCategories = async (defaultCategories) => {
  if (!defaultCategories) return undefined;

  // ✅ No duplicate category in same Subject
  const ids = defaultCategories.map((c) => String(c.categoryId));
  if (new Set(ids).size !== ids.length) {
    throw new ApiError('Duplicate category in defaultCategories', 400);
  }

  // ✅ No duplicate order - If order sent
  const orders = defaultCategories.filter((c) => c.order !== undefined).map((c) => c.order);
  if (new Set(orders).size !== orders.length) {
    throw new ApiError('Duplicate order in defaultCategories', 400);
  }

  // ✅ All categories must exist + active
  const categories = await Category.find({ _id: { $in: ids }, isActive: true }).lean();
  if (categories.length !== ids.length) {
    throw new ApiError('One or more categories not found', 404);
  }

  // ✅ Auto-assign only free orders, never collide with sent orders
  // [{ A }, { B, order: 1 }] -> A = 2, B = 1 ✅
  // [{ A, order: 2 }, { B }] -> A = 2, B = 1 ✅
  const usedOrders = new Set(orders);
  let nextOrder = 1;
  return defaultCategories.map((c) => {
    if (c.order !== undefined) {
      return { categoryId: c.categoryId, maxMarks: c.maxMarks, order: c.order };
    }
    while (usedOrders.has(nextOrder)) nextOrder++;
    const assigned = nextOrder;
    usedOrders.add(assigned);
    nextOrder++;
    return { categoryId: c.categoryId, maxMarks: c.maxMarks, order: assigned };
  });
};

// POST /api/v1/subjects - Admin Only
exports.createSubject = async (req, res, next) => {
  const { name, defaultCategories } = req.body; // ✅ Whitelist
  const normalized = await validateAndNormalizeCategories(defaultCategories);
  // ✅ No duplicate check - Model index throws 11000 -> errorHandler -> 409
  const subject = await Subject.create({ name, defaultCategories: normalized ?? [] });
  return ApiResponse.send(res, 201, { subject }, 'Subject created successfully');
};

// GET /api/v1/subjects - Admin, Teacher
exports.getSubjects = async (req, res, next) => {
  const subjects = await Subject.find({ isActive: true })
    .sort({ name: 1 })
    .populate({
      path: 'defaultCategories.categoryId',
      select: 'name',
      match: { isActive: true }, // ✅ Inactive Category nahi aayegi
    })
    .lean();

  // ✅ Inactive wali entry ko hata do, warna categoryId: null dikhega
  const cleaned = subjects.map((s) => ({
    ...s,
    defaultCategories: s.defaultCategories.filter((c) => c.categoryId),
  }));

  return ApiResponse.send(res, 200, { subjects: cleaned }, 'Subjects fetched successfully');
};

// GET /api/v1/subjects/:id
exports.getSubjectById = async (req, res, next) => {
  const subject = await Subject.findById(req.params.id)
    .populate({
      path: 'defaultCategories.categoryId',
      select: 'name',
      match: { isActive: true }, // ✅ Inactive Category nahi aayegi
    })
    .lean();

  if (!subject || !subject.isActive) {
    return next(new ApiError('Subject not found', 404));
  }

  // ✅ Inactive wali entry ko hata do
  subject.defaultCategories = subject.defaultCategories.filter((c) => c.categoryId);

  return ApiResponse.send(res, 200, { subject }, 'Subject fetched successfully');
};

// PATCH /api/v1/subjects/:id - Admin Only
exports.updateSubject = async (req, res, next) => {
  const { name, defaultCategories } = req.body; // ✅ isActive NOT allowed here
  const subject = await Subject.findOne({ _id: req.params.id, isActive: true });
  if (!subject) return next(new ApiError('Subject not found', 404));

  // ✅ Only update what was sent
  if (name !== undefined) subject.name = name;
  if (defaultCategories !== undefined) {
    const normalized = await validateAndNormalizeCategories(defaultCategories);
    subject.defaultCategories = normalized ?? [];
  }
  await subject.save(); // ✅ runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { subject }, 'Subject updated successfully');
};

// DELETE /api/v1/subjects/:id - Soft Delete - Admin Only
exports.deleteSubject = async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject || !subject.isActive) {
    // ✅ Already deleted = 404, not success
    return next(new ApiError('Subject not found', 404));
  }

  // USED check - Add when SubjectAssignment exists
  // const usedInAssignment = await SubjectAssignment.findOne({ subjectId: subject._id, isActive: true });
  // if (usedInAssignment) {
  //   return next(new ApiError('Cannot delete. It is already used. Deactivate it instead.', 400));
  // }

  subject.isActive = false;
  await subject.save();
  return ApiResponse.send(res, 200, null, 'Subject deleted successfully');
};
