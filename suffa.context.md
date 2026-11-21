### 1. Final Stack - LOCKED

Part | Tech
_Frontend Framework_ | Nuxt 4
_State Management_ | Pinia
_Styling_ | Tailwind CSS
_PWA_ | @vite-pwa/nuxt
_Backend_ | Express.js (Node.js)
_Auth_ | JWT Access Token (15m) + Refresh Token (7d) in HttpOnly Cookie
_Password_ | Bcrypt - genSalt(12)
_Validation_ | _Zod v4 - LOCKED ⭐ - For ALL Backend Validation_
_Database_ | MongoDB Atlas Free - M0 Tier - 512 MB
_MongoDB Free Estimate:_ 300 Students School = 17 MB / Year = Free 512 MB will last ∼30 Years. 1000 Students = ∼10 Years. No need for Paid DB now.

_Architecture:_
suffa-pwa/ - Frontend - Nuxt 4 + Pinia + Tailwind + PWA
app/
pages/
stores/ -> Pinia Stores - auth, assignments, marks, attendance
data/dummy.js -> Dummy Data for now

suffa-api/ - Backend - Express + JWT (Cookie) + Refresh Token + Bcrypt + MongoDB
models/ -> users, teachers, classes, sections, students, subjects, categories, subjectAllocations, subjectAssignments, markSheets, studentAttendance, teacherAttendance
routes/ -> auth, users, assignments, marks, attendance
middleware/ -> JWT check from Cookie
_Auth Flow - Cookie + Refresh Token - LOCKED ⭐:_

1. User Login - Phone + Password
2. Backend checks Password with Bcrypt + Checks `isLocked` / `loginAttempts`
3. If correct, Backend sends 2 Tokens in HttpOnly Cookies:
   - Access Token - 15m - For API calls
   - Refresh Token - 7d - To get new Access Token without re-login
4. Frontend never sees Tokens, Browser handles it
5. On every Request, Browser auto-sends Access Token Cookie
6. If Access Token expires, Frontend calls `/auth/refresh` - Backend checks Refresh Token + `refreshTokenVersion` - Sends new Access Token
7. Pinia stores only User Info - Name, Role, Logged In. Token is NEVER in Pinia / LocalStorage.
8. On Logout, Backend clears BOTH Cookies + Increments `refreshTokenVersion` to kill old Refresh Tokens.

_Setup Commands:_

# Frontend

npx nuxi@latest init suffa-pwa
cd suffa-pwa
npm install @vite-pwa/nuxt
npm run dev

# Backend - Later

npm init -y
npm install express mongoose jsonwebtoken bcryptjs cookie-parser cors validator zod

---

### 1A. Auth Concept - CENTRAL USER - LOCKED ⭐

_Rule:_ 1 Person = 1 User Entry. Name, Phone, Password, Email will live ONLY in `users`. No other collection will have `name / phone / password / email`.

_Why?_

- Earlier `teachers` had name/phone and `students` also had name/phone - Duplicate data.
- Now if name changes, it changes in only 1 place - `users`.
- Admin, Teacher, Student - All 3 logins come from the same place.

_How It Works:_

- Entry is created in `users` -> `role` tells who it is
- If `role: teacher`, profile is created in `teachers` -> `userId -> users._id`
- If `role: student`, profile is created in `students` -> `userId -> users._id`
- If `role: admin`, NO separate profile is created. Admin lives only in `users`.
- If name is needed, fetch it from `users` via `populate()`. Never store duplicate name.

_Folder Split - LOCKED ⭐ - Matches Real Code:_

- `src/modules/auth/` = ONLY Login / Logout / JWT + Refresh logic. Files: `auth.controller.js`, `auth.routes.js`, `auth.validator.js`. NO model file here.
- `src/modules/users/` = ONLY People Management. Files: `user.controller.js`, `user.model.js`, `user.routes.js`, `user.validator.js`. Model lives HERE.
- `auth/` USES `User` model from `users/` folder: `const User = require('../users/user.model')`
- Model Name = `User` - `mongoose.model('User', userSchema)`. All `ref` must be `'User'`, NEVER `'Auth'`. There is NO `Auth` model.

_JWT Payload - LOCKED ⭐ - As Per Real File:_
// Access Token - 15m
{ id: users.\_id, role: "admin" / "teacher" / "student" }

// Refresh Token - 7d
{ id: users.\_id, role: "admin" / "teacher" / "student", version: refreshTokenVersion }

// NEVER { userId: ... } - Middleware reads req.user.id
// userId is ONLY the DB field name in teachers/students, NOT the JWT field.
On every request, Backend will find `teachers` or `students` profile using `req.user.id` -> `teachers.userId = req.user.id`.
_Refresh Token Rule - LOCKED ⭐ - As Per Real File:_

- `refreshTokenVersion` in `users` - Default 0
- On Logout / Password Change / Force Logout, increment `refreshTokenVersion` by 1 - All old Refresh Tokens become invalid
- Refresh endpoint checks `decoded.version === user.refreshTokenVersion`, if not, reject
- Access Token: `JWT_SECRET`, `JWT_EXPIRATION || '15m'`, `HS256`
- Refresh Token: `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION || '7d'`, `HS256`

_Phone + Email Rule - LOCKED ⭐ - As Per Real File:_

- Login ID = Phone ONLY. Email is NOT used for Login.
- Phone stored normalized as 10-digit Indian: `9876543210` - `+91` / `91` / spaces / `-` removed before save.
- Phone validation: Indian mobile - `^[6-9]\d{9}$` or `+91[6-9]\d{9}$`
- Email is REQUIRED + Unique + Lowercase + Trim + `validator.isEmail` - Every User MUST have an Email. Admin must collect Email for every Teacher / Student at creation time. Used for Password Reset / Contact / Future notifications. NEVER for Login.
- If a Student has no personal Email, use Parent's Email. 1 Email = 1 User - Cannot reuse same Email for 2 users.

_Login Security - LOCKED ⭐ - As Per Real File:_

- `loginAttempts` - Default 0 - Max 5 attempts (`LOGIN_MAX_ATTEMPTS` || 5)
- `lockUntil` - Lock for 15 min (`LOGIN_LOCK_MINUTES` || 15) after 5 fails
- Virtual `isLocked` - True if `lockUntil > Date.now()`
- Methods: `incrementLoginAttempts()`, `resetLoginAttempts()` - On success, reset attempts + set `lastLogin`
- Password Reset: `resetPasswordToken` (SHA256) + `resetPasswordExpire` (10 min) + OTP `resetPasswordOtp` (SHA256) + `resetPasswordOtpExpire` (10 min)

### 1A.1. Central User + Profile Pattern - INDUSTRY STANDARD - LOCKED ⭐

_Pattern Name:_ _Central User + Profile Pattern_ - Industry Standard - Used by Laravel / Django / Rails / Firebase / Supabase / Auth0 - `auth.users` for login + `profiles` table linked by `user_id`.
_Rule:_ `users` = ONLY Login / Auth - `name`, `phone`, `email`, `password`, `role`, `isActive`, `loginAttempts`, `refreshTokenVersion`. `teachers` / `students` = ONLY Profile - Extra fields like `qualification`, `rollNo`, `classId`, `sectionId`, `parentName`, `dateOfBirth`, `gender`, `address`. NEVER mix them.
_Why This Pattern?_

- Auth is separate from Profile - Login / Password / JWT must NEVER be mixed with `qualification` / `rollNo`
- 1 Person = 1 Login - If Student becomes Teacher later, keep same `users._id`, just create `teachers` row. No new login, no new password.
- Security - `teachers` / `students` are safe to `populate()` and send to frontend. You never accidentally leak `password` when you fetch a Student list.
- NEVER Single Table - Do NOT put `rollNo`, `qualification`, `classId` in `users` with `null` for Admin - Dirty, 50% fields null.
- NEVER Separate Login Tables - Do NOT give `teachers` / `students` their own `password` / `phone` - 3 login systems, password change in 3 places = Nightmare.
  _Transaction Rule - LOCKED ⭐:_
- ALWAYS create `users` + `teachers` / `students` in ONE Mongoose Transaction (`session.startTransaction()`)
- If profile save fails, `users` save must rollback. NEVER leave orphan `users` with no profile.
- If `users` save fails, profile must NOT be created.
- Same for Delete: NEVER hard delete `users` row. Set `users.isActive: false` only. Do NOT delete `teachers` / `students` row. Old Marks / Attendance stay linked. See Section 5A.
  _Fetch Rule:_
- Name / Phone / Email ALWAYS via `populate('userId', 'name phone email')` from `users`. NEVER store duplicate name in `teachers` / `students`.
- Backend lookup: `Student.findOne({ userId: req.user.id })` / `Teacher.findOne({ userId: req.user.id })` - `req.user.id` = JWT `id` = `users._id` = `teachers.userId` / `students.userId`.

---

### 1B. Validation - ZOD v4 - LOCKED ⭐

_Rule:_ ALL Backend Validation MUST use _Zod v4_. NEVER Zod v3. NEVER `express-validator` / `joi` / `validator` for request validation. `validator` package is ONLY allowed inside Mongoose model for `validator.isEmail`, NOT for request validation.

_Why Zod v4?_

- Zod v3 syntax is DEAD in v4 - `required_error` / `invalid_type_error` / `errorMap` / `z.ZodIssueCode` are ignored / removed in v4 and give default `Invalid input: expected string...` message.
- All validators must follow Zod v4 syntax only.

_Zod v4 Rules - LOCKED ⭐:_

- Use `z.string({ error: '...' })` for wrong type - NEVER `invalid_type_error`
- Use `z.string({ error: (issue) => issue.input === undefined ? '... is required' : '... must be a string' })` for Missing vs Wrong Type - NEVER `required_error`
- Use `z.enum([...], { error: (issue) => ... })` for enums - NEVER `errorMap`
- Use `ctx.addIssue({ code: 'custom', message: '...', path: ['...'] })` in `superRefine` - NEVER `z.ZodIssueCode.custom`
- Use `src/middlewares/validate.middleware.js` with dedupe - 1 error per field, `invalid_type` beats `custom`, return `issue.message` as-is, NEVER prefix with `field:`
- `rollNo` is STRING, NOT number - `"001"`, `"A-12"`, `"50001"` all valid - `rollNo: 50001` (number) must give `Roll number must be a string`
- `dateOfBirth: null` must be blocked - `z.preprocess((val) => val === null || val === '' ? '___invalid-date___' : val, z.coerce.date(...))` - `new Date(null)` = `1970-01-01` bug must NOT pass
- Validator files live in each module: `src/modules/users/user.validator.js`, `src/modules/auth/auth.validator.js`, etc. - 1 Validator = 1 Module, same as 1 Model = 1 Folder.

_Setup:_
npm install zod # Must be v4.x - Check with npm list zod

---

### 1C. ApiResponse + Sanitize - LOCKED ⭐

_File:_ `src/utils/apiResponse.js` - LOCKED ✅
class ApiResponse {
constructor(statusCode, data, message = 'Success') {
this.statusCode = statusCode;
this.data = data;
this.message = message;
this.success = statusCode < 400;
}

static send(res, statusCode, data, message = 'Success') {
return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
}
}

module.exports = ApiResponse;
_Rule - LOCKED:_

- NEVER `res.status().json({ success: true, ... })`
- NEVER `res.status().json(new ApiResponse(...))` - Too long
- ALWAYS `return ApiResponse.send(res, status, data, message)`
- ALWAYS `return` it - No double-send bug
- Response shape ALWAYS: `{ success, statusCode, data, message }`
- Frontend Pinia ALWAYS reads `response.data.data` - Same for Login / Me / Create / List

_Examples - LOCKED:_
// getMe
return ApiResponse.send(res, 200, { user: sanitizeUser(req.user) });

// createUser
return ApiResponse.send(res, 201, { user, profile }, message);

// list
return ApiResponse.send(res, 200, { users, total });

// delete
return ApiResponse.send(res, 200, null, 'Deleted successfully');
// No message = 'Success' automatically
_Sanitize Rule - LOCKED:_

- NEVER return full Mongoose doc. NEVER `res.json({ user })` raw.
- `sanitizeUser(user)` returns ONLY: `id, name, email, phone, role, isActive, avatar, createdAt`
- NEVER return: `password, loginAttempts, lockUntil, resetPasswordToken, resetPasswordOtp, refreshTokenVersion, __v, isLocked, lastLogin`
- `sanitizeProfile(profile)` returns: `{ id, ...rest }` - Removes `_id, __v, userId`
- `userId` NOT duplicated in profile - Already in `user.id`
- `profile: null` for Admin - Admin has no profile

---

### 2. Roles - 3 Roles - LOCKED

Role | Who? | Login
_1. admin_ | School Head | Admin Phone + Password - In `users`, `role: admin`
_2. teacher_ | Fills Marks + Student Attendance | Teacher Phone + Password - In `users`, `role: teacher`
_3. student / parent_ | Views Progress Report | SAME Login - In `users`, `role: student`
_Rule:_ Student and Parent use SAME Login. No separate Parent Account. 1 Student = 1 Login = 1 User Entry.
_Rule:_ Role enum is LOWERCASE - Industry Standard - `["admin", "teacher", "student"]`. NEVER Pascal `Admin / Teacher / Student`. All permission checks use lowercase. Display in UI with `text-transform: capitalize` only - DB always lowercase.

_Example:_
Student: Ayaan - Class 1 - A - Roll No: 5
Login: Parent Phone - 9876543210 + Password
Users: name: Ayaan, email: ayaan.parent@gmail.com, phone: 9876543210, role: student
Students: userId -> Ayaan's users.\_id, rollNo: 5, classId, sectionId
Ayaan opens or his Parent opens - Both see same Progress Report.

---

### 3. Who Does What? - Permission Table - UPDATED - Option A + Assignment = Admin + Teacher ⭐

Task | admin | teacher | student / parent
Create Subject | ✅ | ❌ | ❌
Create Categories | ✅ | ❌ | ❌
Create Allocation | ✅ | ❌ | ❌
Create Assignment (Monthly) | ✅ | ✅ - Only Own Allocation | ❌
Update Assignment (Monthly) - Categories + Status | ✅ | ✅ - Only Own (Main Teacher Snapshot) | ❌
Delete Assignment (Monthly) | ✅ | ❌ | ❌
Fill Marks | ❌ | ✅ | ❌
View Marks - All | ✅ | ❌ | ❌
View Marks - Own | ✅ | ✅ - Own Class | ✅ - Only Own
Share Assignment (Monthly) | ✅ | ✅ - Only Own | ❌
Revoke Share | ✅ | ✅ - Only Own | ❌
Take Student Attendance | ❌ | ✅ | ❌
Take Teacher Attendance | ✅ | ❌ | ❌
View Student Attendance - All | ✅ | ✅ - Own Class | ❌
View Student Attendance - Own | ✅ | ✅ | ✅ - Only Own
View Teacher Attendance - All | ✅ | ❌ | ❌
View Teacher Attendance - Own | ✅ | ✅ - Only Own | ❌
View Progress Report | ✅ | ✅ - Own Class | ✅ - Only Own
_Rule:_ Allocation = Admin Only. Monthly Assignment = Admin + Main Teacher (of that Allocation). Marks + Student Attendance = teacher. Teacher Attendance = admin. View Only = student / parent. Student / Parent cannot Edit anything.
_Auth Rule:_ Permission check will happen from `users.role` (from JWT `req.user.role`), not from `teachers` / `students` table. Always lowercase: `if (req.user.role !== 'admin') return 403`.

---

### 4. Relationships - ER Diagram - UPDATED - Option A ⭐

users (1) ───< teachers (1) [ userId - Only if role: teacher - userId = JWT id ]
users (1) ───< students (1) [ userId - Only if role: student - userId = JWT id ]
users (1) ───< teacherAttendance (Many) [ markedBy - Only if role: admin - markedBy = JWT id ]

teachers (1) ───< subjectAllocations (Many) [ mainTeacherId ]
teachers (1) ───< subjectAssignments (Many) [ mainTeacherId - Snapshot ]
teachers (1) ───< subjectAssignments (Many) [ sharedToTeacherId ]

classes (1) ───< sections (Many)
classes (1) ───< students (Many)
classes (1) ───< subjectAllocations (Many)
classes (1) ───< subjectAssignments (Many) [ via Allocation ]

sections (1) ───< students (Many)
sections (Many) ───< subjectAllocations (Many) [ sectionIds Array ]
sections (Many) ───< subjectAssignments (Many) [ via Allocation ]

subjects (1) ───< subjectAllocations (Many)
subjects (1) ───< subjectAssignments (Many) [ via Allocation ]
categories (Many) ───< subjects (Many) [ defaultCategories Array ]
categories (Many) ───< subjectAssignments (Many) [ categoriesOverride ]

subjectAllocations (1) ───< subjectAssignments (Many) [ allocationId ]
subjectAssignments (1) ───< markSheets (Many)
students (1) ───< markSheets (Many)

classes + sections (1) ───< studentAttendance (Many) [ Per Day ]
students (Many) ───< studentAttendance (Many) [ records Array ]

teachers (Many) ───< teacherAttendance (Many) [ records Array ]
_Rule:_ No Duplicate Data anywhere. Only `_id` is stored. Names come via `populate()` from `users`. `teachers` / `students` do NOT have `name`.
_Rule:_ JWT `id` = `users._id`. DB field `userId` in teachers/students = Same value as JWT `id`. Do not confuse the two names.

---

### 4A. Allocation vs Monthly Assignment - Option A - LOCKED ⭐ NEW

_Why 2 Layers?_

- Allocation = WHO teaches WHAT to WHOM - Long term, whole year / semester. Example: English - Class 1 - [A, B] - Ms. Aisha - Sem 1, 2.
- Monthly Assignment = WHAT to teach THIS MONTH - Short term, 1 month. Example: June 2026 - Sem 1 - English - Class 1 - [A, B] - Ms. Aisha - Words 100, Writing 40.
- Without 2 layers, every month you would re-enter Subject + Class + Section + Teacher. With 2 layers, Teacher just picks Allocation + Month.

_Flow:_

1. Admin creates Allocation once - Subject + Class + Sections + Semesters + Main Teacher
2. Admin OR Main Teacher creates Monthly Assignment from Allocation - Semester + Calendar Month + Academic Year + Categories (optional override)
3. Teacher fills Marks against Monthly Assignment, NOT against Allocation
4. Share is on Monthly Assignment, NOT on Allocation - Short leave = Share Monthly Assignment, Long leave = Update Allocation mainTeacherId

_Snapshot Rule - LOCKED:_

- Monthly Assignment stores `mainTeacherId` as SNAPSHOT from Allocation at creation time.
- If Admin later changes Allocation `mainTeacherId`, old Monthly Assignments keep old Teacher. Only future Monthly Assignments get new Teacher.
- Same for Categories: Monthly Assignment stores `categoriesOverride` + `removedCategoryIds`. Subject defaults changing later does NOT change old Monthly Assignments.

_Example:_
Allocation: English - Class 1 - [A, B] - Ms. Aisha - Sem 1, 2
Monthly Assignments:

- June 2026 - Sem 1 - Ms. Aisha (Snapshot)
- July 2026 - Sem 1 - Ms. Aisha (Snapshot)
- If Aisha leaves in Aug, Admin updates Allocation mainTeacherId = Ms. Sana
- Aug 2026 - Sem 1 - Ms. Sana (New Snapshot)
- June / July still show Ms. Aisha in history - Correct.

---

### 5. Schema - 12 Collections - LOCKED ✅ ALL MODELS LOCKED

_0. `users` - PARENT OF ALL ⭐ - File: `src/modules/users/user.model.js` - LOCKED ✅_
_id: ObjectId - PK
name: String - Required - Trim - Min 2, Max 50 - Name ONLY here
phone: String - Required - Unique - Trim - Login ID - ONLY here - Stored as 10-digit `9876543210`
email: String - Required - Unique - Lowercase - Trim - Validate `validator.isEmail` - MUST have Email for every User - Used for Password Reset / Contact, NEVER for Login - If no personal Email, use Parent's Email
password: String - Required - Bcrypt Hashed - `select: false` - Min 6 - ONLY here
avatar: { public_id: String / Null, url: String / Null } - Optional
role: String - Required - enum: ["admin", "teacher", "student"] - LOWERCASE ONLY - Industry Standard - Default: "student" - Index
isActive: Boolean - default: true
lastLogin: Date
loginAttempts: Number - default: 0 - `select: false` - Lock after 5 fails for 15 min
lockUntil: Date - `select: false`
resetPasswordToken: String - `select: false` - SHA256 hashed
resetPasswordExpire: Date - `select: false`
resetPasswordOtp: String - `select: false` - SHA256 hashed OTP
resetPasswordOtpExpire: Date - `select: false`
refreshTokenVersion: Number - default: 0 - Increment on Logout / Password Change to kill old Refresh Tokens
\_Model:_ `mongoose.model('User', userSchema)`
_Indexes:_ `phone` unique, `email` unique, `role + isActive`, `createdAt: -1`
_Methods:_

- `generateToken()` -> Access JWT `{ id, role }` - 15m - `JWT_SECRET` - HS256
- `generateRefreshToken()` -> Refresh JWT `{ id, role, version: refreshTokenVersion }` - 7d - `JWT_REFRESH_SECRET` - HS256
- `comparePassword()`, `generateResetPasswordToken()`, `generateOTP()` / `verifyOTP()`, `incrementLoginAttempts()` / `resetLoginAttempts()`, Virtual `isLocked`
  _Hooks:_ `pre('save')` - Normalize phone, `pre('save')` - Hash password with `bcrypt.genSalt(12)`
  _Rule:_ 1 Person = 1 User Entry. Admin has no separate collection. Admin is only here with `role: admin`. There is NO `Auth` model. `auth/` folder only handles Login / JWT + Refresh and uses this `User` model.

_1. `teachers` - LOCKED ✅_
_id: ObjectId - PK
userId: ObjectId - FK -> users.\_id - Unique - 1 Teacher = 1 User - `ref: 'User'` - Value = JWT `id`
qualification: String - Trim - Optional
dateOfBirth: Date - Optional
gender: String - enum: ["Male", "Female"] - Optional
address: String - Trim - Optional
// name, phone, password, email - NOT HERE. They are in users.
\_Unique Index:_ `userId`
_Rule:_ Teacher active status comes from `users.isActive`. No separate isActive here.

_2. `classes` - LOCKED ✅_
\_id: ObjectId - PK
name: String - Required - Unique - Trim // Class 1, Class 2
description: String - Trim - Optional
isActive: Boolean - default: true

_3. `sections` - LOCKED ✅_
_id: ObjectId - PK
classId: ObjectId - FK -> classes.\_id - Required - Index
name: String - Required - Trim // A, B, C
isActive: Boolean - default: true
\_Unique Index:_ `classId + name`

_4. `students` - LOCKED ✅_
_id: ObjectId - PK
userId: ObjectId - FK -> users.\_id - Unique - 1 Student = 1 User - `ref: 'User'` - Value = JWT `id`
rollNo: String - Required - Trim - `"001"`, `"A-12"`, `"50001"` - NEVER Number
classId: ObjectId - FK -> classes.\_id - Required - Index
sectionId: ObjectId - FK -> sections.\_id - Required - Index
parentName: String - Trim - Optional // Parent name is different, so it stays here, not in users
dateOfBirth: Date - Optional
gender: String - enum: ["Male", "Female"] - Optional
address: String - Trim - Optional
// name, loginPhone, loginPassword, email - NOT HERE. They are in users.
\_Unique Index:_ `userId`
_Unique Index:_ `classId + sectionId + rollNo`
_Rule:_ Student active status comes from `users.isActive`. No separate isActive here. If student leaves school, set `users.isActive: false`.

_5. `categories` - Library - LOCKED ✅_
\_id: ObjectId - PK
name: String - Required - Unique - Trim // Words, Reading, Writing
isActive: Boolean - default: true

_6. `subjects` - Master - LOCKED ✅_
\_id: ObjectId - PK
name: String - Required - Unique - Trim // English
defaultCategories: [
{ categoryId: ObjectId -> categories._id, maxMarks: 20, order: 1 },
{ categoryId: ObjectId -> categories._id, maxMarks: 40, order: 2 }
]
isActive: Boolean - default: true

_7. `subjectAllocations` - Allocation - Long Term - LOCKED ✅ - Option A ⭐ NEW_
_id: ObjectId - PK
subjectId: ObjectId - FK -> subjects.\_id - Required - Index
classId: ObjectId - FK -> classes.\_id - Required - Index
sectionIds: [ObjectId] - FK -> sections.\_id - Array - Required - Min length 1
semesters: [Number] - enum [1, 2] - default [1, 2]
mainTeacherId: ObjectId - FK -> teachers.\_id - Required - Index
isActive: Boolean - default: true
\_Indexes:_ `subjectId + classId`, `mainTeacherId`
_Rule:_ NO Share here. Share is ONLY on Monthly Assignment. If Allocation is deleted / deactivated, Monthly Assignments remain as history.
_Rule:_ Changing `mainTeacherId` here does NOT change old Monthly Assignments - Snapshot Rule - See Section 4A.
_Rule:_ Sections / Semesters cannot be changed after Monthly Assignments exist - Create new Allocation instead.

_8. `subjectAssignments` - Monthly Assignment - Most Important ⭐ - LOCKED ✅ - Option A ⭐ UPDATED_
_id: ObjectId - PK
allocationId: ObjectId - FK -> subjectAllocations.\_id - Required - Index
semester: Number - enum [1, 2] - Required - Must be in Allocation semesters
calendarMonth: Number - 1 to 12 - Required - Example: 6 = June
academicYear: Number - Required - Example: 2026
mainTeacherId: ObjectId - FK -> teachers.\_id - Required - Index - SNAPSHOT from Allocation at creation time
sharedToTeacherId: ObjectId / Null - FK -> teachers.\_id - Default Null - Index
sharedUntil: Date / Null - Default Null
sharedBy: ObjectId / Null - FK -> users.\_id - `ref: 'User'` - Teacher or Admin who shared - Value = JWT `id` - NEVER `ref: 'Auth'`
categoriesOverride: [ { categoryId: ObjectId -> categories._id, maxMarks: Number, order: Number } ] - Default [] // If different for this Month, else empty
removedCategoryIds: [ObjectId] - FK -> categories.\_id - Default [] // Default categories removed for this Month
status: String - enum: ["pending", "in_progress", "completed"] - Default "pending"
isActive: Boolean - default: true
\_Unique Index:_ `allocationId + semester + calendarMonth + academicYear` - 1 Assignment per Allocation per Month
_Indexes:_ `mainTeacherId + sharedToTeacherId`, `allocationId`
_Rule:_ Categories are NOT stored here as full list. Effective Categories = Subject defaults - removed + override. Frontend uses `effectiveCategories` only. See Section 7A.
_Rule:_ NO hard delete if MarkSheets exist. Block delete. See Section 5A.
_Rule:_ Cannot change Categories if MarkSheets exist. Block update. See Section 5A.

_9. `markSheets` - LOCKED ✅_
_id: ObjectId - PK
assignmentId: ObjectId - FK -> subjectAssignments.\_id - Required - Index - Points to MONTHLY Assignment, NOT Allocation
studentId: ObjectId - FK -> students.\_id - Required - Index
classId: ObjectId - FK -> classes.\_id - Required
sectionId: ObjectId - FK -> sections.\_id - Required
semester: Number - enum [1, 2] - Required
month: String - Required - "2026-11" - Index - Derived from Monthly Assignment calendarMonth + academicYear
enteredByTeacherId: ObjectId - FK -> teachers.\_id - Required
enteredAt: Date - default Date.now
marks: [
{ categoryId: ObjectId -> categories._id, obtainedMarks: Number min 0, maxMarks: Number min 1 }
]
total: Number - Calculated - Default 0
totalMax: Number - Calculated - Default 0
\_Rule:_ 1 Student = 1 Entry. All Categories inside one Entry as Array. Not 1 Entry per Category. This makes Entries 3x less.
_Unique Index:_ `assignmentId + studentId + month + semester`
_Index:_ `studentId + month` - For Progress Report fast
_Rule:_ NO isActive here. Marks are history, never deactivate or delete.

_10. `studentAttendance` - LOCKED ✅_
_id: ObjectId - PK
classId: ObjectId - FK -> classes.\_id - Required - Index
sectionId: ObjectId - FK -> sections.\_id - Required - Index
date: String - Required - "2026-11-14" - Index
takenByTeacherId: ObjectId - FK -> teachers.\_id - Required
records: [
{ studentId: ObjectId -> students._id, status: "Present" / "Absent" default Present, reason: String default "" }
]
totalPresent: Number - Calculated - Default 0
totalAbsent: Number - Calculated - Default 0
\_Rule:_ 1 Class + 1 Day = 1 Entry. All Students inside as Array. Default all Present. Teacher only taps Absent ones.
_Unique Index:_ `classId + sectionId + date`
_Rule:_ NO isActive here. Attendance is history, never deactivate.

_11. `teacherAttendance` - LOCKED ✅_
_id: ObjectId - PK
date: String - Required - Unique - "2026-11-14" - Index
markedBy: ObjectId - FK -> users.\_id - `ref: 'User'` - Required - Admin's users.\_id = JWT `id`, because Admin has no entry in teachers - NEVER `ref: 'Auth'`
records: [
{ teacherId: ObjectId -> teachers._id, status: "Present" / "Absent" default Present, reason: String default "" }
]
totalPresent: Number - Calculated - Default 0
totalAbsent: Number - Calculated - Default 0
\_Rule:_ Teacher cannot mark own Attendance. Only Admin marks it. Default all Present. Same Present / Absent + Optional Reason system as Student Attendance.
_Unique Index:_ `date`
_Rule:_ NO isActive here. Attendance is history, never deactivate.

_Performance Indexes:_
Collection | Index | Why?
`users` | `phone` | Login fast
`markSheets` | `assignmentId + studentId + month` | Progress Report opens fast
`studentAttendance` | `classId + sectionId + date` | Daily Attendance fast
`subjectAssignments` | `mainTeacherId + sharedToTeacherId` | Teacher Dashboard fast

---

### 5A. isActive + Delete Rule - LOCKED ⭐ - UPDATED - Option A

_Rule:_ Never hard delete Master Data with `deleteOne()`. Hard delete breaks old Marks, Attendance, and Report Cards.

_Where isActive EXISTS:_
Collection | isActive? | Why?
`users` | YES | Deactivate Teacher / Student login. This is the single switch for Teacher / Student active status.
`classes` | YES | Hide old Class from dropdown, old data stays safe
`sections` | YES | Hide closed Section like Class 1-C from dropdown, old data stays safe
`subjects` | YES | Hide stopped Subject like Computer from dropdown, old Marks stay safe
`categories` | YES | Hide old Category like Words from dropdown, old Marks stay safe
`teachers` | NO | Use `users.isActive`. No duplicate flag.
`students` | NO | Use `users.isActive`. No duplicate flag.
`subjectAllocations` | YES | Hide old Allocation, Monthly Assignments stay as history. Block delete if Monthly Assignments exist.
`subjectAssignments` | YES | Soft delete Monthly Assignment. Block delete if MarkSheets exist. History stays.
`markSheets` | NO | History, never delete or deactivate
`studentAttendance` | NO | History, never delete or deactivate
`teacherAttendance` | NO | History, never delete or deactivate

_How Delete Works:_

1. Admin clicks Delete on Subject / Class / Section / Category / Allocation / Monthly Assignment
2. Backend checks if it is USED in any Allocation / Monthly Assignment / Marks / Attendance
3. If USED -> Block Delete, show error: "Cannot delete. It is already used. Deactivate it instead." - Exception: Monthly Assignment with Marks = Block completely, cannot even deactivate if Marks exist? No - Deactivate allowed, Delete blocked.
4. If NOT USED -> Soft Delete: `isActive: false`. Row stays in DB, hidden from dropdowns.
5. All dropdowns for NEW Allocation / NEW Assignment / NEW Entry must filter `{ isActive: true }`
6. Old Monthly Assignments / Marks / Reports still show the name via `populate()`, even if `isActive: false`

_Example:_
2025: Subject = Computer, Marks entered
2026: School stops Computer
Admin sets `isActive: false`
Result: New Allocation dropdown hides Computer, Old 2025 Progress Report still shows Computer marks correctly.

_For Teachers / Students:_
To remove a Teacher / Student, set `users.isActive: false`. Do NOT delete `users` row, do NOT delete `teachers` / `students` row. Login will stop working, but old Marks / Attendance stay linked.

_For Allocations / Monthly Assignments:_

- Allocation delete blocked if any active Monthly Assignment exists - Delete Monthly Assignments first or deactivate Allocation.
- Monthly Assignment delete blocked if any MarkSheet exists - Marks are history.
- Monthly Assignment categories update blocked if any MarkSheet exists - Marks use snapshot maxMarks, changing categories would break totals.

---

### 6. Allocation Rule - Section Rule

_Rule:_ As long as Teacher is SAME, put Sections in one Row. As soon as Teacher is DIFFERENT, Break the Row.

_Example 1 - Same Teacher:_
English - Class 1 - [A, B] - Ms. Aisha = 1 Row
_Example 2 - Different Teacher:_
English - Class 1 - [A] - Ms. Aisha = Row 1
English - Class 1 - [B] - Ms. Sana = Row 2
_Example 3 - 3 Sections:_
Class 1-A English - Ms. Aisha
Class 1-B English - Ms. Aisha
Class 1-C English - Ms. Sana
So Rows = 2
Row 1: Class 1 - [A, B] - Ms. Aisha
Row 2: Class 1 - [C] - Ms. Sana

---

### 7. Allocation Screen - Admin - UPDATED - Option A ⭐

Admin -> Allocations -> + New Allocation

1. Subject: [ English ▼ ]
2. Class: [ Class 1 ▼ ]
3. Section: [ ✓ A ] [ ✓ B ] [ ☐ C ]
4. Semester: [ ✓ Sem 1 ] [ ✓ Sem 2 ]
5. Teacher: [ Ms. Aisha ▼ ] // List comes from users where role: teacher
   [ Cancel ] [ Save Allocation ]
   _Rule:_ Dropdowns in this screen show only `isActive: true` Subjects / Classes / Sections / Teachers. See Section 5A.

### 7A. Monthly Assignment Screen - Admin + Teacher - UPDATED - Option A ⭐ NEW

Admin OR Main Teacher -> Allocations -> Allocation -> + New Monthly Assignment

1. Allocation: [ English - Class 1 - A, B - Ms. Aisha ] - Already selected
2. Semester: [ Sem 1 ▼ ] - Must be in Allocation semesters
3. Calendar Month: [ June ▼ ]
4. Academic Year: [ 2026 ]
5. Categories + Max Marks - Auto-filled from Subject defaults:
   Words [ 20 ]
   Reading [ 40 ]
   Writing [ 40 ]
   [ + Add New Category ] - Dropdown from `GET /categories` - Only `isActive: true`
   [ Cancel ] [ Save Assignment ]
   _Rule:_ Teacher can only create Monthly Assignment for OWN Allocation - `allocation.mainTeacherId == teacherId`. Admin can create for any Allocation.
   _Rule:_ Categories come automatically from Subject Default. If different for this Month, change here, it goes in `categoriesOverride` + `removedCategoryIds`. Subject master is NOT changed.
   _Rule:_ Frontend NEVER uses `subject.defaultCategories` from Allocation response. Allocation response sends only `subject: { _id, name }`. Frontend uses `effectiveCategories` from Monthly Assignment response for display + editing.

---

### 8. Share Rule - Absent Case ⭐ LOCKED - UPDATED - Share is on Monthly Assignment

_Problem:_ How will Ms. Sana's Monthly Assignment show to Ms. Aisha? Normally Aisha only sees her own Monthly Assignment.

_Solution - Both Can Share:_

_A. Main Teacher Shares:_
On Sana's Dashboard:
MY ASSIGNMENTS:
Class 1 - C - English - June 2026
[ Fill Marks ] [ ↗ Share ]
Share Popup:
Share Assignment - Class 1 - C - English - June 2026
Share To Whom? [ Ms. Aisha ▼ ]
For How Long?
[ ○ For Today - 14 Nov ]
[ ○ For 2 Days ]
[ ○ Until I Come Back ]
[ Cancel ] [ Share ]
_B. Admin Can Also Share:_
If Sana could not call, Admin does:
Admin -> Monthly Assignments -> Class 1 - C - English - June 2026
Main Teacher: Ms. Sana
Share To: [ Ms. Aisha ▼ ]
Till When: [ For Today ]
[ Share ] [ Revoke Share ]
_C. What Will Aisha See?_
MY ASSIGNMENTS:

- Class 1 - A, B - English - June 2026
  SHARED WITH ME - SHARED BY OTHERS:
- Class 1 - C - English - June 2026 - Shared by Ms. Sana ⭐
  [ Fill Marks ] [ Attendance ]
  _D. What Saves In Marks / Attendance?_
  assignmentId: Class 1 - C - June 2026 (Sana's Monthly Assignment)
  enteredByTeacherId / takenByTeacherId: Ms. Aisha (Who filled it)
  sharedBy: Ms. Sana / Admin - users._id = JWT `id` (Who shared it)
  \_E. Revoke:_
  Sana or Admin can click `Revoke Share`. Aisha stops seeing C.
  _F. Long Leave:_
  Short leave = Share Monthly Assignment. Long leave = Admin updates Allocation `mainTeacherId`. Old Monthly Assignments keep old Teacher (Snapshot), only future Monthly Assignments get new Teacher.

_Safety Rules:_

1. Admin sees everything: `Class 1 - C - June 2026 - Main: Sana - Shared To: Aisha - Shared By: Sana/Admin`
2. No Chain Share: Aisha got a Shared Assignment, she cannot share it further. Only Main Teacher or Admin can Share.
   _Note:_ Main Teacher and Shared Teacher are NOT Roles. Both have Role = teacher. It is just Monthly Assignment relation.

---

### 9. Teacher Flow - Marks Entry

1. Teacher Login - From users
2. Dashboard shows 2 Sections:
   - `My Assignments` - Her own Monthly Assignments
   - `Shared With Me` - Shared by others
3. She clicks any, Students + Categories come - Student names come from users via populate
4. On top, Dropdown `Who Took Class Today?` is selected (In Shared case, Aisha auto-selected)
5. She fills Marks for all Students - Bulk API `POST /mark-sheets/bulk` - 30 students in 1 call
6. She clicks Save -> For 30 Students, 30 Entries created, not 90

---

### 10. Student Attendance Flow - Teacher

1. Teacher Login -> Dashboard -> `My Assignments` / `Shared With Me`
2. Clicks `[ Attendance ]` on any Monthly Assignment
3. Screen:
   Attendance - Class 1 - A - 14 Nov 2026
   Taken By: Ms. Aisha
   Ayaan - [ ✅ Present ] [ ❌ Absent ]
   Fatima - [ ✅ Present ] [ ❌ Absent ]
   ...
   [ Save Attendance ]
4. Default all Present. Teacher taps Absent only.
5. If Absent tapped, Optional Reason box opens:
   Reason? [ Optional ]
   [ 🤒 Sick ] [ 🏠 Family Trip ] [ ✍️ Type... ]
6. Reason is NOT Mandatory. Teacher can leave empty.
7. Save -> 1 Entry for whole Class for that Day.
   _Attendance Statuses - LOCKED:_

- Present ✅ - Student came
- Absent ❌ - Student did not come
- NO separate Leave status. Leave is handled as Reason: `Absent + Reason: Sick / Family Trip`.

---

### 11. Teacher Attendance Flow - Admin

1. Admin Login -> Dashboard -> `[ Teacher Attendance - Today ]`
2. Screen:
   Teacher Attendance - 14 Nov 2026
   Marked By: Admin
   Ms. Aisha - [ ✅ Present ] [ ❌ Absent ]
   Ms. Sana - [ ✅ Present ] [ ❌ Absent ] -> Reason: Sick
   ...
   [ Save ]
3. Default all Present. Admin taps Absent only.
4. If Absent, Optional Reason - Same as Student Attendance.
5. Save -> 1 Entry for whole School for that Day.
   _Benefit:_ Admin sees who is Absent today, then immediately Shares that Teacher's Monthly Assignment to another Teacher. No need to remember.
   _Teacher View:_ Teacher can only View own Attendance, cannot Mark it.
   My Attendance - Nov 2026
   Present: 22 / 25 - 88%
   Absent: 3 - 14 Nov: Sick

---

### 12. Student / Parent Flow - Progress Report

1. Student / Parent Login with SAME Login - `users` phone + password, `role: student`
2. Dashboard shows:
   Hi Ayaan 👋 - Name comes from users
   Class 1 - A
   Attendance - Nov 2026
   Present: 22 / 25 Days - 88%
   Absent: 3 Days

- 12 Nov: Sick
- 13 Nov: Sick
- 20 Nov: Family Trip
  [ View Details ]
  Marks - Nov 2026
  English - Words: 18/20
  English - Reading: 35/40
  Total: 53/60 - 88%
  Month: Nov 2026

3. Month-wise filter - Nov, Oct, Sep
4. Subject-wise view - Which Subject is weak
5. Only own Progress visible, not other Student's - Backend checks JWT `id` -> `students.userId = JWT id`
6. Cannot Edit anything, View Only

---

### 13. Folder Structure - Nuxt 4 + Backend - UPDATED - Option A

suffa-pwa/
app/
pages/
index.vue -> Dashboard (Role wise different)
marks/[assignmentId].vue -> Marks Entry - Teacher only
attendance/[classId].vue -> Student Attendance - Teacher only
teacher-attendance.vue -> Teacher Attendance - Admin only
progress.vue -> Progress Report - Student / Parent only
stores/
auth.js -> Pinia - User Info only, No Token
assignments.js
marks.js
attendance.js
app.vue
data/
dummy.js -> Dummy Data
nuxt.config.ts -> PWA Config
public/
We will NOT use Nuxt 3. In Nuxt 4, `app/` folder comes, `pages/` is inside it.

suffa-api/
src/modules/
auth/ -> auth.controller.js, auth.routes.js, auth.validator.js - NO MODEL - Uses User model for Login / JWT + Refresh
users/ -> user.model.js, user.controller.js, user.routes.js, user.validator.js - Model lives HERE - mongoose.model('User') - Controller LOCKED ✅ (create + getMe + updatePassword)
teachers/
classes/
sections/
students/
categories/
subjects/
subjectAllocations/ -> subjectAllocation.model.js, controller, routes, validator - Allocation - Admin Only
subjectAssignments/ -> subjectAssignment.model.js, controller, routes, validator - Monthly Assignment - Admin + Main Teacher
markSheets/ -> markSheet.model.js, controller, routes, validator - Marks - Teacher Only for Fill, Admin + Teacher + Student for View
studentAttendance/
teacherAttendance/
src/middlewares/ -> validate.middleware.js - Zod v4 dedupe middleware - 1 error per field
src/utils/ -> apiResponse.js (LOCKED ✅), apiError.js, sendToken.js
_Rule:_ 1 Model = 1 Folder. `auth` is exception - It has NO model, it uses `User` model. `users` folder holds the `User` model.

---

### 14. API Response Rules - Allocations vs Assignments - LOCKED ⭐ NEW

_Rule:_ Frontend NEVER gets `defaultCategories` from Allocation or Assignment response. Only `effectiveCategories` from Monthly Assignment.
API | Subject field | Categories field
`GET /subject-allocations` | `subject: { _id, name }` | ❌ None
`GET /subject-allocations/:id` | `subject: { _id, name }` | ❌ None
`GET /subject-assignments` | `subject: { _id, name }` | ✅ `effectiveCategories: [ { categoryId, name, maxMarks, order } ]`
`GET /subject-assignments/:id` | `subject: { _id, name }` | ✅ `effectiveCategories`
`GET /subjects` | - | ✅ `defaultCategories` - Admin only, for Subject master edit
`GET /categories` | - | ✅ `[{ _id, name }]` - For Add Category dropdown
_Rule:_ `categoriesOverride` / `removedCategoryIds` are stored in DB but NOT sent to frontend in Assignment response. Frontend sends them in PATCH, backend uses them to compute `effectiveCategories`.

---

### In One Line - Full Project

> _Frontend: Nuxt 4 + Pinia + Tailwind + PWA. Backend: Express + JWT Access (15m) + Refresh (7d) in HttpOnly Cookie + Bcrypt + MongoDB Atlas Free M0 + Zod v4 for ALL Validation + ApiResponse.send() for ALL Success Responses. Central User: 1 Person = 1 User Entry (name/phone/email/password only in users, phone is Login ID, email is Required, JWT uses `id`, role is lowercase). Admin creates Allocation. Admin + Main Teacher creates Monthly Assignment. Teacher fills Marks + Student Attendance. If Absent, Main Teacher or Admin Shares Monthly Assignment to another Teacher. Admin takes Teacher Attendance daily. Student and Parent use SAME Login to see Progress Report + Attendance. 1 Student = 1 Entry for Marks, 1 Class + 1 Day = 1 Entry for Attendance._

_What was changed in this update:_

- Added: _Section 4A - Allocation vs Monthly Assignment - Option A - LOCKED_ - 2 layers explained, Snapshot Rule
- Added: _Section 7A - Monthly Assignment Screen - Admin + Teacher_
- Added: _Section 14 - API Response Rules - Allocations vs Assignments_ - `defaultCategories` never sent from Allocation / Assignment, only `effectiveCategories`
- Updated: _Section 3 - Permission Table_ - `Create Assignment (Monthly) = Admin + Teacher (Own Allocation)`, `Update Assignment = Admin + Main Teacher`, `Create Allocation = Admin Only` added
- Updated: _Section 4 - ER Diagram_ - `subjectAllocations` + `subjectAssignments` split, `subjectAssignments` -> `markSheets` via Monthly Assignment
- Updated: _Section 5 - Schema_ - 11 -> 12 Collections - `subjectAllocations` (NEW) + `subjectAssignments` (Monthly, UPDATED with allocationId, semester, calendarMonth, academicYear, categoriesOverride, removedCategoryIds, status, isActive)
- Updated: _Section 5A - isActive Table_ - `subjectAllocations: YES`, `subjectAssignments: YES`, Block rules for Marks
- Updated: _Section 7 - Allocation Screen_ - Now Allocation only, no Categories
- Updated: _Section 8 - Share Rule_ - Share is on Monthly Assignment, Long Leave = Update Allocation
- Updated: _Section 13 - Folder Structure_ - `subjectAllocations/` + `subjectAssignments/` + `markSheets/` split
- Updated: _In One Line_ - Admin creates Allocation, Admin + Main Teacher creates Monthly Assignment
- Status: `subjectAllocation.helper.js` - _LOCKED ✅_ - Slim subject, no defaultCategories
- Status: `subjectAssignment.helper.js` - _LOCKED ✅_ - Slim subject, only effectiveCategories
- Status: `markSheets` - _LOCKED ✅_ - Model + Validator + Helper + Controller as per spec

_Now LOCKED ✅ as per your file: Option A = Allocation + Monthly Assignment, Assignment Create = Admin + Teacher, Role = lowercase, Email = required, JWT = `id`, Refresh = YES, Validation = Zod v4, Central User + Profile = Industry Standard, Response = `ApiResponse.send()` ONLY, Sanitize = No Leak._
