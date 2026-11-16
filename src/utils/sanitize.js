const sanitizeUser = (user) => {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar?.url || null,
  };
};

const toRef = (val) => {
  if (!val) return null;
  if (typeof val === 'object') return { id: val._id, name: val.name };
  return { id: val, name: null };
};

const sanitizeProfile = (profile) => {
  if (!profile) return null;
  const p = profile.toObject ? profile.toObject() : { ...profile };
  const { _id, __v, userId, classId, sectionId, createdAt, updatedAt, ...rest } = p;

  const out = {};
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
