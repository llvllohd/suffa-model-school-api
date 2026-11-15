### 1. Final Stack - LOCKED
Part | Tech
**Frontend Framework** | Nuxt 4
**State Management** | Pinia
**Styling** | Tailwind CSS
**PWA** | @vite-pwa/nuxt
**Backend** | Express.js (Node.js)
**Auth** | JWT Access Token (15m) + Refresh Token (7d) in HttpOnly Cookie
**Password** | Bcrypt - genSalt(12)
**Database** | MongoDB Atlas Free - M0 Tier - 512 MB
*MongoDB Free Estimate:* 300 Students School = 17 MB / Year = Free 512 MB will last ~30 Years. 1000 Students = ~10 Years. No need for Paid DB now.

*Architecture:*
suffa-pwa/ - Frontend - Nuxt 4 + Pinia + Tailwind + PWA
  app/
    pages/
    stores/ -> Pinia Stores - auth, assignments, marks, attendance
  data/dummy.js -> Dummy Data for now

suffa-api/ - Backend - Express + JWT (Cookie) + Refresh Token + Bcrypt + MongoDB
  models/ -> users, teachers, classes, sections, students, subjects, categories, subjectAssignments, markSheets, studentAttendance, teacherAttendance
  routes/ -> auth, users, assignments, marks, attendance
  middleware/ -> JWT check from Cookie
*Auth Flow - Cookie + Refresh Token - LOCKED ⭐:*
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

*Setup Commands:*
# Frontend
npx nuxi@latest init suffa-pwa
cd suffa-pwa
npm install @vite-pwa/nuxt
npm run dev

# Backend - Later
npm init -y
npm install express mongoose jsonwebtoken bcryptjs cookie-parser cors validator
---

### 1A. Auth Concept - CENTRAL USER - LOCKED ⭐
*Rule:* 1 Person = 1 User Entry. Name, Phone, Password, Email will live ONLY in `users`. No other collection will have `name / phone / password / email`.

*Why?*
- Earlier `teachers` had name/phone and `students` also had name/phone - Duplicate data.
- Now if name changes, it changes in only 1 place - `users`.
- Admin, Teacher, Student - All 3 logins come from the same place.

*How It Works:*
- Entry is created in `users` -> `role` tells who it is
- If `role: teacher`, profile is created in `teachers` -> `userId -> users._id`
- If `role: student`, profile is created in `students` -> `userId -> users._id`
- If `role: admin`, NO separate profile is created. Admin lives only in `users`.
- If name is needed, fetch it from `users` via `populate()`. Never store duplicate name.

*Folder Split - LOCKED ⭐ - Matches Real Code:*
- `src/modules/auth/` = ONLY Login / Logout / JWT + Refresh logic. Files: `auth.controller.js`, `auth.routes.js`, `auth.validator.js`. NO model file here.
- `src/modules/users/` = ONLY People Management. Files: `user.controller.js`, `user.model.js`, `user.routes.js`. Model lives HERE.
- `auth/` USES `User` model from `users/` folder: `const User = require('../users/user.model')`
- Model Name = `User` - `mongoose.model('User', userSchema)`. All `ref` must be `'User'`, NEVER `'Auth'`. There is NO `Auth` model.

*JWT Payload - LOCKED ⭐ - As Per Real File:*
```js
// Access Token - 15m
{ id: users._id, role: "admin" / "teacher" / "student" }

// Refresh Token - 7d
{ id: users._id, role: "admin" / "teacher" / "student", version: refreshTokenVersion }

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
Students: userId -> Ayaan's users._id, rollNo: 5, classId, sectionId
Ayaan opens or his Parent opens - Both see same Progress Report.
---

### 3. Who Does What? - Permission Table
Task | admin | teacher | student / parent
Create Subject | ✅ | ❌ | ❌
Create Categories | ✅ | ❌ | ❌
Create Assignment | ✅ | ❌ | ❌
Fill Marks | ❌ | ✅ | ❌
View Marks - All | ✅ | ❌ | ❌
View Marks - Own | ✅ | ✅ - Own Class | ✅ - Only Own
Share Assignment | ✅ | ✅ - Only Own | ❌
Revoke Share | ✅ | ✅ - Only Own | ❌
Take Student Attendance | ❌ | ✅ | ❌
Take Teacher Attendance | ✅ | ❌ | ❌
View Student Attendance - All | ✅ | ✅ - Own Class | ❌
View Student Attendance - Own | ✅ | ✅ | ✅ - Only Own
View Teacher Attendance - All | ✅ | ❌ | ❌
View Teacher Attendance - Own | ✅ | ✅ - Only Own | ❌
View Progress Report | ✅ | ✅ - Own Class | ✅ - Only Own
_Rule:_ Assignment = admin. Marks + Student Attendance = teacher. Teacher Attendance = admin. View Only = student / parent. Student / Parent cannot Edit anything.
_Auth Rule:_ Permission check will happen from `users.role` (from JWT `req.user.role`), not from `teachers` / `students` table. Always lowercase: `if (req.user.role !== 'admin') return 403`.

---

### 4. Relationships - ER Diagram
users (1) ───< teachers (1) [ userId - Only if role: teacher - userId = JWT id ]
users (1) ───< students (1) [ userId - Only if role: student - userId = JWT id ]
users (1) ───< teacherAttendance (Many) [ markedBy - Only if role: admin - markedBy = JWT id ]

teachers (1) ───< subjectAssignments (Many) [ Main Teacher ]
teachers (1) ───< subjectAssignments (Many) [ Shared To Teacher ]

classes (1) ───< sections (Many)
classes (1) ───< students (Many)
classes (1) ───< subjectAssignments (Many)

sections (1) ───< students (Many)
sections (Many) ───< subjectAssignments (Many) [ sectionIds Array ]

subjects (1) ───< subjectAssignments (Many)
categories (Many) ───< subjects (Many) [ defaultCategories Array ]
categories (Many) ───< subjectAssignments (Many) [ categoriesOverride ]

subjectAssignments (1) ───< markSheets (Many)
students (1) ───< markSheets (Many)

classes + sections (1) ───< studentAttendance (Many) [ Per Day ]
students (Many) ───< studentAttendance (Many) [ records Array ]

teachers (Many) ───< teacherAttendance (Many) [ records Array ]
_Rule:_ No Duplicate Data anywhere. Only `_id` is stored. Names come via `populate()` from `users`. `teachers` / `students` do NOT have `name`.
_Rule:_ JWT `id` = `users._id`. DB field `userId` in teachers/students = Same value as JWT `id`. Do not confuse the two names.
---

### 5. Schema - 11 Collections - LOCKED ✅ ALL MODELS LOCKED

_0. `users` - PARENT OF ALL ⭐ - File: `src/modules/users/user.model.js`_
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
_Model:_ `mongoose.model('User', userSchema)`
_Indexes:_ `phone` unique, `email` unique, `role + isActive`, `createdAt: -1`
_Methods:_
- `generateToken()` -> Access JWT `{ id, role }` - 15m - `JWT_SECRET` - HS256
- `generateRefreshToken()` -> Refresh JWT `{ id, role, version: refreshTokenVersion }` - 7d - `JWT_REFRESH_SECRET` - HS256
- `comparePassword()`, `generateResetPasswordToken()`, `generateOTP()` / `verifyOTP()`, `incrementLoginAttempts()` / `resetLoginAttempts()`, Virtual `isLocked`
_Hooks:_ `pre('save')` - Normalize phone, `pre('save')` - Hash password with `bcrypt.genSalt(12)`
_Rule:_ 1 Person = 1 User Entry. Admin has no separate collection. Admin is only here with `role: admin`. There is NO `Auth` model. `auth/` folder only handles Login / JWT + Refresh and uses this `User` model.

_1. `teachers` - LOCKED ✅_
_id: ObjectId - PK
userId: ObjectId - FK -> users._id - Unique - 1 Teacher = 1 User - `ref: 'User'` - Value = JWT `id`
qualification: String - Trim - Optional
dateOfBirth: Date - Optional
gender: String - enum: ["Male", "Female"] - Optional
address: String - Trim - Optional
// name, phone, password, email - NOT HERE. They are in users.
_Unique Index:_ `userId`
_Rule:_ Teacher active status comes from `users.isActive`. No separate isActive here.

_2. `classes` - LOCKED ✅_
_id: ObjectId - PK
name: String - Required - Unique - Trim // Class 1, Class 2
description: String - Trim - Optional
isActive: Boolean - default: true

_3. `sections` - LOCKED ✅_
_id: ObjectId - PK
classId: ObjectId - FK -> classes._id - Required - Index
name: String - Required - Trim // A, B, C
isActive: Boolean - default: true
_Unique Index:_ `classId + name`

_4. `students` - LOCKED ✅_
_id: ObjectId - PK
userId: ObjectId - FK -> users._id - Unique - 1 Student = 1 User - `ref: 'User'` - Value = JWT `id`
rollNo: Number - Required
classId: ObjectId - FK -> classes._id - Required - Index
sectionId: ObjectId - FK -> sections._id - Required - Index
parentName: String - Trim - Optional // Parent name is different, so it stays here, not in users
dateOfBirth: Date - Optional
gender: String - enum: ["Male", "Female"] - Optional
address: String - Trim - Optional
// name, loginPhone, loginPassword, email - NOT HERE. They are in users.
_Unique Index:_ `userId`
_Unique Index:_ `classId + sectionId + rollNo`
_Rule:_ Student active status comes from `users.isActive`. No separate isActive here. If student leaves school, set `users.isActive: false`.

_5. `categories` - Library - LOCKED ✅_
_id: ObjectId - PK
name: String - Required - Unique - Trim // Words, Reading, Writing
isActive: Boolean - default: true

_6. `subjects` - Master - LOCKED ✅_
_id: ObjectId - PK
name: String - Required - Unique - Trim // English
defaultCategories: [
  { categoryId: ObjectId -> categories._id, maxMarks: 20, order: 1 },
  { categoryId: ObjectId -> categories._id, maxMarks: 40, order: 2 }
]
isActive: Boolean - default: true

_7. `subjectAssignments` - Most Important ⭐ - LOCKED ✅_
_id: ObjectId - PK
subjectId: ObjectId - FK -> subjects._id - Required - Index
classId: ObjectId - FK -> classes._id - Required - Index
sectionIds: [ObjectId] - FK -> sections._id - Array - Required - Min length 1 - Validate at least 1 Section
semesters: [Number] - enum [1, 2] - default [1, 2]
mainTeacherId: ObjectId - FK -> teachers._id - Required - Index
sharedToTeacherId: ObjectId / Null - FK -> teachers._id - Default Null - Index
sharedUntil: Date / Null - Default Null
sharedBy: ObjectId / Null - FK -> users._id - `ref: 'User'` - Teacher or Admin who shared - Value = JWT `id` - NEVER `ref: 'Auth'`
categoriesOverride: [ { categoryId: ObjectId -> categories._id, maxMarks: Number, order: Number default 1 } ] - Default [] // If different for this Class, else empty
_Indexes:_ `mainTeacherId + sharedToTeacherId`, `classId + subjectId`
_Rule:_ NO isActive here. If unassigned, delete the row directly. See Section 5A.

_8. `markSheets` - LOCKED ✅_
_id: ObjectId - PK
assignmentId: ObjectId - FK -> subjectAssignments._id - Required - Index
studentId: ObjectId - FK -> students._id - Required - Index
classId: ObjectId - FK -> classes._id - Required
sectionId: ObjectId - FK -> sections._id - Required
semester: Number - enum [1, 2] - Required
month: String - Required - "2026-11" - Index
enteredByTeacherId: ObjectId - FK -> teachers._id - Required
enteredAt: Date - default Date.now
marks: [
  { categoryId: ObjectId -> categories._id, obtainedMarks: Number min 0, maxMarks: Number min 1 }
]
total: Number - Calculated - Default 0
totalMax: Number - Calculated - Default 0
_Rule:_ 1 Student = 1 Entry. All Categories inside one Entry as Array. Not 1 Entry per Category. This makes Entries 3x less.
_Unique Index:_ `assignmentId + studentId + month + semester`
_Index:_ `studentId + month` - For Progress Report fast
_Rule:_ NO isActive here. Marks are history, never deactivate or delete.

_9. `studentAttendance` - LOCKED ✅_
_id: ObjectId - PK
classId: ObjectId - FK -> classes._id - Required - Index
sectionId: ObjectId - FK -> sections._id - Required - Index
date: String - Required - "2026-11-14" - Index
takenByTeacherId: ObjectId - FK -> teachers._id - Required
records: [
  { studentId: ObjectId -> students._id, status: "Present" / "Absent" default Present, reason: String default "" }
]
totalPresent: Number - Calculated - Default 0
totalAbsent: Number - Calculated - Default 0
_Rule:_ 1 Class + 1 Day = 1 Entry. All Students inside as Array. Default all Present. Teacher only taps Absent ones.
_Unique Index:_ `classId + sectionId + date`
_Rule:_ NO isActive here. Attendance is history, never deactivate.

_10. `teacherAttendance` - LOCKED ✅_
_id: ObjectId - PK
date: String - Required - Unique - "2026-11-14" - Index
markedBy: ObjectId - FK -> users._id - `ref: 'User'` - Required - Admin's users._id = JWT `id`, because Admin has no entry in teachers - NEVER `ref: 'Auth'`
records: [
  { teacherId: ObjectId -> teachers._id, status: "Present" / "Absent" default Present, reason: String default "" }
]
totalPresent: Number - Calculated - Default 0
totalAbsent: Number - Calculated - Default 0
_Rule:_ Teacher cannot mark own Attendance. Only Admin marks it. Default all Present. Same Present / Absent + Optional Reason system as Student Attendance.
_Unique Index:_ `date`
_Rule:_ NO isActive here. Attendance is history, never deactivate.

_Performance Indexes:_
Collection | Index | Why?
`users` | `phone` | Login fast
`markSheets` | `assignmentId + studentId + month` | Progress Report opens fast
`studentAttendance` | `classId + sectionId + date` | Daily Attendance fast
`subjectAssignments` | `mainTeacherId + sharedToTeacherId` | Teacher Dashboard fast
---

### 5A. isActive + Delete Rule - LOCKED ⭐
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
`subjectAssignments` | NO | If unassigned, delete the row directly. No history is tied to this row itself.
`markSheets` | NO | History, never delete or deactivate
`studentAttendance` | NO | History, never delete or deactivate
`teacherAttendance` | NO | History, never delete or deactivate

_How Delete Works:_
1. Admin clicks Delete on Subject / Class / Section / Category
2. Backend checks if it is USED in any Assignment or Marks or Attendance
3. If USED -> Block Delete, show error: "Cannot delete. It is already used. Deactivate it instead."
4. If NOT USED -> Soft Delete: `isActive: false`. Row stays in DB, hidden from dropdowns.
5. All dropdowns for NEW Assignment / NEW Entry must filter `{ isActive: true }`
6. Old Assignments / Marks / Reports still show the name via `populate()`, even if `isActive: false`

_Example:_
2025: Subject = Computer, Marks entered
2026: School stops Computer
Admin sets `isActive: false`
Result: New Assignment dropdown hides Computer, Old 2025 Progress Report still shows Computer marks correctly.

_For Teachers / Students:_
To remove a Teacher / Student, set `users.isActive: false`. Do NOT delete `users` row, do NOT delete `teachers` / `students` row. Login will stop working, but old Marks / Attendance stay linked.
---

### 6. Assignment Rule - Section Rule
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

### 7. Assignment Screen - Admin
Admin -> Assignments -> + New Assignment
1. Subject: [ English ▼ ]
2. Class: [ Class 1 ▼ ]
3. Section: [ ✓ A ] [ ✓ B ] [ ☐ C ]
4. Semester: [ ✓ Sem 1 ] [ ✓ Sem 2 ]
5. Teacher: [ Ms. Aisha ▼ ] // List comes from users where role: teacher
6. Categories + Max Marks:
   Words [ 20 ]
   Reading [ 40 ]
   Writing [ 40 ]
   [ + Add New Category ]
[ Cancel ] [ Save Assignment ]
Categories come automatically from Subject Default. If different for this Class, change here, it goes in `categoriesOverride`.
_Rule:_ Dropdowns in this screen show only `isActive: true` Subjects / Classes / Sections / Teachers. See Section 5A.
---

### 8. Share Rule - Absent Case ⭐ LOCKED
_Problem:_ How will Ms. Sana's Assignment show to Ms. Aisha? Normally Aisha only sees her own Assignment.

_Solution - Both Can Share:_

_A. Main Teacher Shares:_
On Sana's Dashboard:
MY ASSIGNMENTS:
Class 1 - C - English
[ Fill Marks ] [ ↗ Share ]
Share Popup:
Share Assignment - Class 1 - C - English
Share To Whom? [ Ms. Aisha ▼ ]
For How Long?
[ ○ For Today - 14 Nov ]
[ ○ For 2 Days ]
[ ○ Until I Come Back ]
[ Cancel ] [ Share ]
_B. Admin Can Also Share:_
If Sana could not call, Admin does:
Admin -> Assignments -> Class 1 - C - English
Main Teacher: Ms. Sana
Share To: [ Ms. Aisha ▼ ]
Till When: [ For Today ]
[ Share ] [ Revoke Share ]
_C. What Will Aisha See?_
MY ASSIGNMENTS:
- Class 1 - A, B - English
SHARED WITH ME - SHARED BY OTHERS:
- Class 1 - C - English - Shared by Ms. Sana ⭐
  [ Fill Marks ] [ Attendance ]
_D. What Saves In Marks / Attendance?_
assignmentId: Class 1 - C (Sana's)
enteredByTeacherId / takenByTeacherId: Ms. Aisha (Who filled it)
sharedBy: Ms. Sana / Admin - users._id = JWT `id` (Who shared it)
_E. Revoke:_
Sana or Admin can click `Revoke Share`. Aisha stops seeing C.

_Safety Rules:_
1. Admin sees everything: `Class 1 - C - Main: Sana - Shared To: Aisha - Shared By: Sana/Admin`
2. No Chain Share: Aisha got a Shared Assignment, she cannot share it further. Only Main Teacher or Admin can Share.
_Note:_ Main Teacher and Shared Teacher are NOT Roles. Both have Role = teacher. It is just Assignment relation.
---

### 9. Teacher Flow - Marks Entry
1. Teacher Login - From users
2. Dashboard shows 2 Sections:
   - `My Assignments` - Her own
   - `Shared With Me` - Shared by others
3. She clicks any, Students + Categories come - Student names come from users via populate
4. On top, Dropdown `Who Took Class Today?` is selected (In Shared case, Aisha auto-selected)
5. She fills Marks for all Students
6. She clicks Save -> For 30 Students, 30 Entries created, not 90
---

### 10. Student Attendance Flow - Teacher
1. Teacher Login -> Dashboard -> `My Assignments` / `Shared With Me`
2. Clicks `[ Attendance ]` on any Assignment
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
_Benefit:_ Admin sees who is Absent today, then immediately Shares that Teacher's Assignment to another Teacher. No need to remember.
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

### 13. Folder Structure - Nuxt 4 + Backend
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
    users/ -> user.model.js, user.controller.js, user.routes.js - Model lives HERE - mongoose.model('User')
    teachers/
    classes/
    sections/
    students/
    categories/
    subjects/
    subjectAssignments/
    markSheets/
    studentAttendance/
    teacherAttendance/
  _Rule:_ 1 Model = 1 Folder. `auth` is exception - It has NO model, it uses `User` model. `users` folder holds the `User` model.

---

### In One Line - Full Project
> _Frontend: Nuxt 4 + Pinia + Tailwind + PWA. Backend: Express + JWT Access (15m) + Refresh (7d) in HttpOnly Cookie + Bcrypt + MongoDB Atlas Free M0. Central User: 1 Person = 1 User Entry (name/phone/email/password only in users, phone is Login ID, email is Required, JWT uses `id`, role is lowercase). Admin creates Assignment. Teacher fills Marks + Student Attendance. If Absent, Main Teacher or Admin Shares it to another Teacher. Admin takes Teacher Attendance daily. Student and Parent use SAME Login to see Progress Report + Attendance. 1 Student = 1 Entry for Marks, 1 Class + 1 Day = 1 Entry for Attendance._

**What was changed in this update:**
- Roles: ALL `Admin` -> `admin`, `Teacher` -> `teacher`, `Student` -> `student` - In 1A, 2, 3, 4, 5, 7, 8, 12 - JWT, checks, examples, permission table
- Role Rule: **LOWERCASE ONLY - Industry Standard** - Display with `capitalize` in UI only, DB always lowercase
- Email: OPTIONAL + `sparse` -> **REQUIRED + Unique** - Every User MUST have Email - If no personal Email, use Parent's Email - 1 Email = 1 User
- Section 5 `users`: `email` - Required, Unique, `validator.isEmail` - Indexes: `email` unique (no sparse)
- Section 1A: `name, phone, password, email` all ONLY in `users`

**Now LOCKED ✅ as per your file: Role = lowercase, Email = required, JWT = `id`, Refresh = YES. Your `User` model needs ZERO changes - LOCKED ✅**