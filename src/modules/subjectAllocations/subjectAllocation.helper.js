const SubjectAllocation = require('./subjectAllocation.model');
const ApiError = require('@/utils/apiError');
const { formatTeacher } = require('../teachers/teacher.helper');

// Overlap check - same Subject + Class + Section + Semester must not already have an Allocation
const checkAllocationOverlap = async (subjectId, classId, sectionIds, semesters, excludeId = null) => {
  const query = {
    subjectId,
    classId,
    isActive: true,
    sectionIds: { $in: sectionIds },
    semesters: { $in: semesters },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await SubjectAllocation.findOne(query).lean();
  if (existing) {
    throw new ApiError('This Subject is already allocated to one of these Sections for the selected Semester', 409);
  }
};

const formatAllocation = (allocation) => {
  if (!allocation) return null;
  const { subjectId, classId, sectionIds, mainTeacherId, __v, ...rest } = allocation;
  return {
    ...rest,
    // Slim subject - only id and name, defaultCategories not needed in Allocation response
    subject: subjectId ? { _id: subjectId._id, name: subjectId.name } : null,
    class: classId,
    sections: sectionIds,
    mainTeacher: formatTeacher(mainTeacherId),
  };
};

const populateAllocation = (query) =>
  query
    // Only name is needed, defaultCategories are not sent to frontend from Allocation
    .populate('subjectId', 'name')
    .populate('classId', 'name')
    .populate('sectionIds', 'name')
    .populate({
      path: 'mainTeacherId',
      populate: { path: 'userId', select: 'name email phone role avatar isActive' },
    });

const getFormattedAllocationById = async (id) => {
  const allocation = await populateAllocation(SubjectAllocation.findOne({ _id: id, isActive: true })).lean();
  return formatAllocation(allocation);
};

module.exports = { checkAllocationOverlap, formatAllocation, populateAllocation, getFormattedAllocationById };
