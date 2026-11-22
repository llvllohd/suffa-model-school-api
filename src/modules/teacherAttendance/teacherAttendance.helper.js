const formatTeacherAttendance = (doc) => {
  if (!doc) return null;
  const { records, takenByAdminId, __v, ...rest } = doc;
  return {
    ...rest,
    takenByAdmin: takenByAdminId ? { _id: takenByAdminId._id, name: takenByAdminId.name, email: takenByAdminId.email } : null,
    records: (records || []).map((r) => ({
      teacher: r.teacherId,
      status: r.status,
      reason: r.reason || '',
    })),
  };
};

const populateTeacherAttendance = (query) =>
  query
    .populate('takenByAdminId', 'name email')
    .populate({ path: 'records.teacherId', populate: { path: 'userId', select: 'name email phone role avatar isActive' } });

module.exports = { formatTeacherAttendance, populateTeacherAttendance };
