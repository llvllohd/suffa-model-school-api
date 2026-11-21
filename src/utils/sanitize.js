const sanitizeUser = (user) => {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar?.url || null,
    isActive: u.isActive,
  };
};

const toRef = (val) => {
  if (!val) return null;
  // Populated doc - Keep _id, same as formatTeacher / formatStudent
  if (typeof val === 'object') return { _id: val._id, name: val.name };
  // Plain ObjectId - Name not available
  return { _id: val, name: null };
};

const sanitizeProfile = (profile) => {
  if (!profile) return null;
  const p = profile.toObject ? profile.toObject() : { ...profile };
  // Drop profile _id / timestamps - User _id is the main id in merged response
  // Drop userId / classId / sectionId - They are replaced by class / section below
  const { _id, __v, userId, classId, sectionId, createdAt, updatedAt, ...rest } = p;

  const out = {};
  // Only include fields with value - Skips null / undefined
  // rollNumber, admissionNumber, guardianName, guardianPhone, qualification etc. come from here
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null && value !== undefined) out[key] = value;
  }

  if (classId !== undefined) out.class = toRef(classId);
  if (sectionId !== undefined) out.section = toRef(sectionId);
  return out;
};

const mergeUserProfile = (user, profile) => {
  return {
    ...sanitizeUser(user),
    ...sanitizeProfile(profile),
  };
};

module.exports = { sanitizeUser, sanitizeProfile, mergeUserProfile };
