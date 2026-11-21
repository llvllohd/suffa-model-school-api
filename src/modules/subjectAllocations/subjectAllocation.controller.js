const mongoose = require('mongoose');
const SubjectAllocation = require('./subjectAllocation.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const Subject = require('../subjects/subject.model');
const Class = require('../classes/class.model');
const Section = require('../sections/section.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const paginate = require('@/utils/paginate');
const { formatAllocation, populateAllocation, getFormattedAllocationById } = require('./subjectAllocation.helper');
const { getActiveTeacherById, getTeacherIdFromUser } = require('../teachers/teacher.helper');

// POST /api/v1/subject-allocations - Admin Only
// Transaction used - Overlap check + Create in one atomic operation
// Prevents duplicate Allocation when 2 Admins create at same time
exports.createSubjectAllocation = async (req, res, next) => {
  const { subjectId, classId, sectionIds, semesters, mainTeacherId } = req.body;

  const session = await mongoose.startSession();
  try {
    let createdId = null;

    await session.withTransaction(async () => {
      const [subject, cls, teacher] = await Promise.all([
        Subject.findOne({ _id: subjectId, isActive: true }).session(session).lean(),
        Class.findOne({ _id: classId, isActive: true }).session(session).lean(),
        getActiveTeacherById(mainTeacherId, session),
      ]);
      if (!subject) throw new ApiError('Subject not found', 404);
      if (!cls) throw new ApiError('Class not found', 404);
      if (!teacher) throw new ApiError('Teacher not found', 404);

      const sections = await Section.find({ _id: { $in: sectionIds }, classId, isActive: true })
        .session(session)
        .lean();
      if (sections.length !== sectionIds.length) {
        throw new ApiError('One or more Sections not found or do not belong to this Class', 404);
      }

      const finalSemesters = semesters && semesters.length ? semesters : [1, 2];

      // Overlap check inside transaction - Second request waits here
      const query = {
        subjectId,
        classId,
        isActive: true,
        sectionIds: { $in: sectionIds },
        semesters: { $in: finalSemesters },
      };
      const existing = await SubjectAllocation.findOne(query).session(session).lean();
      if (existing) {
        throw new ApiError('This Subject is already allocated to one of these Sections for the selected Semester', 409);
      }

      const created = await SubjectAllocation.create([{ subjectId, classId, sectionIds, semesters: finalSemesters, mainTeacherId: teacher._id }], { session });
      createdId = created[0]._id;
    });

    const allocation = await getFormattedAllocationById(createdId);
    return ApiResponse.send(res, 201, { allocation }, 'Subject allocated successfully');
  } finally {
    await session.endSession();
  }
};

// GET /api/v1/subject-allocations - Admin: all, Teacher: only mine
// Paginated - ?page=1&limit=10&classId=...&subjectId=...
exports.getSubjectAllocations = async (req, res, next) => {
  let filter = { isActive: true };
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    filter = { ...filter, mainTeacherId: teacherId };
  }
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;

  // populateAllocation is a function - Optimized paginate.js supports function form
  const { data, total, page, pages, limit, hasNextPage, hasPrevPage } = await paginate(SubjectAllocation, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { createdAt: -1 },
    populate: populateAllocation,
  });

  return ApiResponse.send(
    res,
    200,
    {
      allocations: data.map(formatAllocation),
      pagination: { total, page, pages, limit, hasNextPage, hasPrevPage },
    },
    'Allocations fetched successfully',
  );
};

// GET /api/v1/subject-allocations/:id - Admin: any, Teacher: only mine
exports.getSubjectAllocationById = async (req, res, next) => {
  const allocationRaw = await populateAllocation(SubjectAllocation.findOne({ _id: req.params.id, isActive: true })).lean();
  if (!allocationRaw) return next(new ApiError('Allocation not found', 404));
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const isMine = String(allocationRaw.mainTeacherId?._id || allocationRaw.mainTeacherId) === String(teacherId);
    if (!isMine) return next(new ApiError('Not authorized to view this allocation', 403));
  }
  return ApiResponse.send(res, 200, { allocation: formatAllocation(allocationRaw) }, 'Allocation fetched successfully');
};

// PATCH /api/v1/subject-allocations/:id - Admin Only
// NOTE - Changing mainTeacherId here does NOT change old Assignments - Snapshot rule
// Only future Monthly Assignments will get the new Teacher
// Short leave: Share the Assignment, Long leave: Update mainTeacherId here
// Sections / Semesters cannot be changed after Assignments exist - Create new Allocation instead
exports.updateSubjectAllocation = async (req, res, next) => {
  const { sectionIds, semesters, mainTeacherId } = req.body;

  const session = await mongoose.startSession();
  try {
    let updatedId = null;

    await session.withTransaction(async () => {
      const allocation = await SubjectAllocation.findOne({ _id: req.params.id, isActive: true }).session(session);
      if (!allocation) throw new ApiError('Allocation not found', 404);

      // Block sections / semesters change if any active Assignment exists
      if (sectionIds !== undefined || semesters !== undefined) {
        const hasAssignments = await SubjectAssignment.exists({ allocationId: allocation._id, isActive: true }).session(session);
        if (hasAssignments) {
          throw new ApiError(
            'Cannot change Sections or Semesters - Monthly Assignments already exist for this Allocation. Create a new Allocation instead.',
            409,
          );
        }
      }

      if (mainTeacherId !== undefined) {
        const teacher = await getActiveTeacherById(mainTeacherId, session);
        if (!teacher) throw new ApiError('Teacher not found', 404);
        allocation.mainTeacherId = teacher._id;
      }
      if (sectionIds !== undefined) {
        const sections = await Section.find({ _id: { $in: sectionIds }, classId: allocation.classId, isActive: true })
          .session(session)
          .lean();
        if (sections.length !== sectionIds.length) throw new ApiError('One or more Sections not found', 404);
        allocation.sectionIds = sectionIds;
      }
      if (semesters !== undefined) allocation.semesters = semesters;

      // Overlap check inside transaction
      const overlapQuery = {
        subjectId: allocation.subjectId,
        classId: allocation.classId,
        isActive: true,
        sectionIds: { $in: allocation.sectionIds },
        semesters: { $in: allocation.semesters },
        _id: { $ne: allocation._id },
      };
      const existing = await SubjectAllocation.findOne(overlapQuery).session(session).lean();
      if (existing) {
        throw new ApiError('This Subject is already allocated to one of these Sections for the selected Semester', 409);
      }

      await allocation.save({ session });
      updatedId = allocation._id;
    });

    const updated = await getFormattedAllocationById(updatedId);
    return ApiResponse.send(res, 200, { allocation: updated }, 'Allocation updated successfully');
  } finally {
    await session.endSession();
  }
};

// DELETE /api/v1/subject-allocations/:id - Soft Delete - Admin Only
// Block if any active Monthly Assignment exists - Otherwise Assignments become orphan
exports.deleteSubjectAllocation = async (req, res, next) => {
  const allocation = await SubjectAllocation.findById(req.params.id);
  if (!allocation || !allocation.isActive) return next(new ApiError('Allocation not found', 404));

  const hasAssignments = await SubjectAssignment.exists({ allocationId: allocation._id, isActive: true });
  if (hasAssignments) {
    return next(new ApiError('Cannot delete Allocation - Monthly Assignments already exist for this Allocation', 409));
  }

  allocation.isActive = false;
  await allocation.save();
  return ApiResponse.send(res, 200, null, 'Allocation deleted successfully');
};

// NOTE - Share / Unshare is NOT on Allocation
// Short leave: POST /api/v1/subject-assignments/:id/share - Main Teacher or Admin - Only that month's Assignment
// Long leave: PATCH /api/v1/subject-allocations/:id - Admin - Update mainTeacherId
