# SUFFAH MODEL SCHOOL — Backend & Domain Spec

Single source of truth for the **suffa-model-school-api** repo: what the system does (roles, permissions, data model, business rules, flows) and how the backend is built (auth, conventions, endpoint reference).

Frontend build spec (separate repo, written so an AI agent can generate and run the whole app): [suffa.frontend.md](suffa.frontend.md).

Where the original design and the code disagreed, this file follows the **code** (see [§16](#16-spec-vs-code-differences)).

**Contents**
Part A — Domain: §1 Overview · §2 Roles · §3 Identity · §4 Relationships · §5 Allocation vs Assignment · §6 Data Model · §7 Delete Rules · §8 Sharing · §9 Flows · §10 API Contract
Part B — Backend: §11 Structure & Pipeline · §12 Auth · §13 Conventions · §14 Endpoints · §15 Env, Commands, Status
§16 Spec vs Code Differences

---

# Part A — Domain

## 1. System Overview

School management system for one school: students, teachers, subject teaching assignments, monthly marks, daily attendance, progress reports.

| Part | Tech |
|------|------|
| Frontend | Nuxt 4 + Pinia + Tailwind CSS + `@vite-pwa/nuxt` (separate repo, `suffa-pwa`) |
| Backend | Node.js >= 18 · Express 4 · Mongoose 8 · Zod 4 · jsonwebtoken · bcryptjs (12 rounds) · cookie-parser · helmet · cors · express-rate-limit · express-mongo-sanitize · pino · Brevo (`sib-api-v3-sdk`) + Handlebars. CommonJS, no TypeScript, `@/` alias → `src/` |
| Database | MongoDB Atlas free M0 (512 MB). ~300 students ≈ 17 MB/year, so the free tier lasts decades |
| Auth | JWT access (15m) + refresh (7d) in HttpOnly cookies |

**In one line:** Admin creates Allocations. Admin + main teacher create Monthly Assignments. Teachers fill marks and student attendance. If a teacher is absent, the main teacher or admin shares that Monthly Assignment with another teacher. Admin takes teacher attendance daily. Student and parent share one login to see their progress report and attendance. One student = one mark entry per assignment/month; one class-section + one day = one attendance entry.

---

## 2. Roles

| Role | Who | Notes |
|------|-----|-------|
| `admin` | School head | Lives only in `users`; no profile |
| `teacher` | Teaching staff | `users` + `teachers` profile |
| `student` | Student / parent | `users` + `students` profile. Student and parent use the **same** login. No separate parent account |

- Role values are **lowercase** everywhere (DB, JWT, API). The UI may display them capitalized.
- "Main teacher" and "shared teacher" are **not** roles — both are `teacher`. They are relationships on a Monthly Assignment.

### 2.1 Permission table

| Task | admin | teacher | student |
|------|:-----:|:-------:|:-------:|
| Create users (admin/teacher/student) | ✅ | ❌ | ❌ |
| Manage classes, sections, subjects, categories | ✅ | ❌ (read only) | ❌ |
| Create / edit / delete Allocation | ✅ | ❌ (read only) | ❌ |
| Create Monthly Assignment | ✅ | ✅ own allocation only | ❌ |
| Update Monthly Assignment (categories, status) | ✅ | ✅ own (main teacher) only | ❌ |
| Delete Monthly Assignment | ✅ | ❌ | ❌ |
| Share / unshare Monthly Assignment | ✅ | ✅ own only (no chain share) | ❌ |
| Fill marks | ❌ | ✅ | ❌ |
| View marks | ✅ all | ✅ own classes | ✅ own only |
| Take student attendance | ❌ | ✅ | ❌ |
| View student attendance | ✅ all | ✅ own classes | ✅ own only |
| Take teacher attendance | ✅ | ❌ | ❌ |
| View teacher attendance | ✅ all | ✅ own only | ❌ |
| View progress report | ✅ | ✅ own classes | ✅ own only |
| Dashboard | admin dashboard | teacher dashboard | student dashboard |

Permission checks use `role` from the JWT, never the `teachers`/`students` table. Students can only view; they can never edit anything.

---

## 3. Identity: Central User + Profile

**1 person = 1 `users` document.** Name, phone, email, password live **only** in `users`.

- `role: teacher` → also a `teachers` document (`userId` → `users._id`).
- `role: student` → also a `students` document (`userId` → `users._id`).
- `role: admin` → no profile (`profile: null`).
- Names are fetched through `populate('userId', 'name phone email')`; profiles never store them.
- JWT `id` = `users._id` = `teachers.userId` / `students.userId`.

**Login ID is phone** (10-digit Indian mobile, `^[6-9]\d{9}$`; `+91`/`91`/spaces/dashes stripped). **Email is required and unique but never used for login** — it is for password reset and notifications. A student without a personal email uses the parent's email. One email = one user.

**Create/Delete rules**
- Create `users` + profile atomically (single transaction). No orphan users.
- Never hard-delete users or profiles. Deactivate via `users.isActive = false`; old marks and attendance stay linked.
- Teacher/student active status is `users.isActive` only (no flag on profiles).

**Login security:** after `LOGIN_MAX_ATTEMPTS` (5) failed logins the account locks for `LOGIN_LOCK_MINUTES` (15). Password reset works by emailed link or OTP (both expire in `PASSWORD_EXPIRE` / `OTP_EXPIRE`, default 10 min).

---

## 4. Relationships

```
users 1──< teachers (userId)            users 1──< students (userId)
users 1──< teacherAttendance (takenByAdminId, role admin)

classes 1──< sections            classes 1──< students     sections 1──< students
classes 1──< subjectAllocations  sections >──< subjectAllocations (sectionIds[])
subjects 1──< subjectAllocations teachers 1──< subjectAllocations (mainTeacherId)
categories >──< subjects (defaultCategories[])

subjectAllocations 1──< subjectAssignments (allocationId)
teachers 1──< subjectAssignments (mainTeacherId snapshot / sharedToTeacherId)
categories >──< subjectAssignments (categoriesOverride / removedCategoryIds)

subjectAssignments 1──< markSheets     students 1──< markSheets
classes+sections 1──< studentAttendance (per day; records[] of students)
teacherAttendance (per day; records[] of teachers)
```

No duplicated data anywhere — only `_id`s are stored across collections.

---

## 5. Allocation vs Monthly Assignment

| Layer | Meaning | Created by | Lifetime |
|-------|---------|------------|----------|
| **Allocation** | Who teaches what to whom: subject + class + sections + semesters + main teacher | Admin | Whole year / long term |
| **Monthly Assignment** | What is taught *this month*: allocation + semester + calendar month + academic year + categories | Admin or the allocation's main teacher | One month |

Marks are filled against the **Monthly Assignment**, never the Allocation. Sharing is on the Monthly Assignment.

**Flow**
1. Admin creates an Allocation once (e.g. English – Class 1 – [A, B] – Ms. Aisha – Sem 1, 2).
2. Admin or main teacher creates a Monthly Assignment for a semester/month/year (categories default from the subject).
3. Teacher fills marks for that assignment.

**Snapshot rule:** a Monthly Assignment copies `mainTeacherId` from the allocation at creation. Changing the allocation's teacher later affects only *future* assignments; history keeps the old teacher. Likewise, subject default categories changing later does not alter existing assignments.

**Allocation rules**
- Same teacher → put all sections in one row (`sectionIds`); different teacher → separate rows (e.g. Class 1 [A, B] Aisha, Class 1 [C] Sana).
- Sections/semesters can't change once Monthly Assignments exist — create a new allocation.
- Teacher can create a Monthly Assignment only if `allocation.mainTeacherId` is theirs; semester must be in the allocation's `semesters`.
- One assignment per allocation + semester + calendar month + academic year (duplicate → 409).

**Effective categories** = subject `defaultCategories` − `removedCategoryIds` + `categoriesOverride`. At least one category must remain. A category can't be in both override and removed.

**Assignment status:** `pending` → `completed`. A completed assignment cannot be edited or shared (but unsharing is allowed).

---

## 6. Data Model

All collections keep `_id` + Mongoose timestamps. Model names: `User`, `Teacher`, `Student`, `Class`, `Section`, `Subject`, `Category`, `SubjectAllocation`, `SubjectAssignment`, `MarkSheet`, `StudentAttendance`, `TeacherAttendance`. Every ref to users is `'User'` (there is no `Auth` model).

**users** — `name`(2–50), `phone`(unique, login), `email`(unique, lowercase), `password`(bcrypt, `select:false`), `avatar{public_id,url}`, `role`(`admin|teacher|student`, default `student`), `isActive`, `lastLogin`, `loginAttempts`, `lockUntil`, `resetPasswordToken/Expire`, `resetPasswordOtp/OtpExpire` (hashed SHA-256), `refreshTokenVersion`(default 0). Unique indexes on phone and email are **partial on `isActive: true`**, so a deactivated user's phone/email can be reused.

**teachers** — `userId`(unique), `qualification`, `dateOfBirth`, `gender`(`Male|Female`), `address`.

**students** — `userId`(unique), `classId`, `sectionId`, `rollNumber`, `admissionNumber`, `dateOfBirth`, `gender`, `address`, `guardianName`, `guardianPhone`.

**classes** — `name`, `description`, `isActive`. **sections** — `classId`, `name`, `isActive`. **categories** — `name`, `isActive`. Names are unique among active records (case-insensitive collation); sections unique per `classId + name`.

**subjects** — `name`, `defaultCategories[{ categoryId, maxMarks, order }]`, `isActive`.

**subjectAllocations** — `subjectId`, `classId`, `sectionIds[]`(≥1), `semesters[]`(1|2, default `[1,2]`), `mainTeacherId`, `isActive`.

**subjectAssignments** — `allocationId`, `semester`(1|2), `calendarMonth`(1–12), `academicYear`, `mainTeacherId`(snapshot), `sharedToTeacherId`, `sharedUntil`, `sharedBy`(→User), `categoriesOverride[{categoryId,maxMarks,order}]`, `removedCategoryIds[]`, `status`(`pending|completed`), `isActive`. Unique on allocation + semester + month + year.

**markSheets** — `assignmentId`, `studentId`, `classId`, `sectionId`, `semester`, `monthKey`(`"YYYY-MM"`), `enteredByTeacherId`, `enteredAt`, `marks[{ categoryId, obtainedMarks, maxMarks }]`, `total`, `totalMax`. One doc per student, all categories inside. Unique on `assignmentId + studentId + monthKey + semester`; index `studentId + monthKey` for reports. `maxMarks` is a snapshot from the assignment — clients never send it.

**studentAttendance** — `classId`, `sectionId`, `date`(`"YYYY-MM-DD"`), `takenByTeacherId`, `records[{ studentId, status, reason }]`, `totalPresent`, `totalAbsent`. Unique on `classId + sectionId + date`.

**teacherAttendance** — `date`(unique, `"YYYY-MM-DD"`), `takenByAdminId`(→User), `records[{ teacherId, status, reason }]`, `totalPresent`, `totalAbsent`.

**Attendance statuses:** only `Present` and `Absent` (capitalized). No separate "Leave"; leave is `Absent` with a `reason` (optional, ≤200 chars). Default is Present — the teacher/admin only taps absentees.

---

## 7. Deactivate / Delete Rules

Never hard-delete master data — it would break old marks, attendance and report cards.

| Collection | `isActive`? | Delete behavior |
|------------|:-----------:|-----------------|
| users | ✅ | Deactivate = remove teacher/student |
| classes, sections, subjects, categories | ✅ | Soft delete; blocked if used |
| subjectAllocations | ✅ | Blocked if active Monthly Assignments exist |
| subjectAssignments | ✅ | Soft delete (also clears sharing); **blocked if mark sheets exist** |
| teachers, students | ❌ | Use `users.isActive` |
| markSheets, studentAttendance, teacherAttendance | ❌ | History; never deleted |

- Dropdowns for **new** entries filter `isActive: true`. Historical records still show names of deactivated items.
- Assignment categories can't change once mark sheets exist.

---

## 8. Sharing (Teacher Absent)

Short leave = share the Monthly Assignment. Long leave = admin changes the allocation's `mainTeacherId` (old assignments keep the old teacher).

- **Who can share:** admin, or the assignment's main teacher. **No chain sharing** — a shared teacher can't re-share.
- Body: `sharedToTeacherId` (must be an active teacher, not the main teacher, not yourself) and optional `sharedUntil` (future date; omitted = until revoked). UI presets: today / 2 days / until I'm back.
- Revoke = unshare (main teacher or admin).
- A shared assignment appears under **Shared With Me** for the receiving teacher until `sharedUntil` passes; expired shares are hidden/forbidden.
- Marks/attendance saved while shared record the teacher who did the work (`enteredByTeacherId` / `takenByTeacherId`) and the assignment/share owner (`sharedBy`).
- Admin sees everything: main teacher, shared-to, shared-by.

---

## 9. User Flows

**Teacher — marks entry:** log in → dashboard shows *My Assignments* and *Shared With Me* → open an assignment (students + effective categories) → fill marks for all students → one bulk call. 30 students = 30 documents (not 90).

**Teacher — student attendance:** from an assignment open *Attendance* for a date → all students default Present → tap Absent with optional reason (quick picks: Sick, Family trip, or typed) → save → one document for the class-section for that day.

**Admin — teacher attendance:** dashboard → *Teacher Attendance – Today* → all teachers default Present, mark absentees with optional reason → save → one document for the whole school for that day. The admin can then share the absent teacher's assignments. Teachers can only *view* their own attendance (e.g. "Present 22/25 – 88%, Absent 3").

**Student / parent — progress:** log in with the same phone + password → dashboard with monthly attendance (present/absent counts, %, absent days with reasons) and marks (per subject/category, total and %) → month filter and subject-wise view to spot weak subjects. Own data only; view-only.

**Admin:** manage users, classes, sections, subjects, categories; create allocations; oversee all assignments, marks and attendance; admin dashboard.

---

## 10. API Contract Rules

- **Response envelope:** `{ success, statusCode, data, message }`. Clients read `response.data.data`.
- Frontend **never** uses a subject's `defaultCategories` from allocation/assignment responses.

| Endpoint | Subject field | Categories field |
|----------|---------------|------------------|
| `GET /subject-allocations`, `/:id` | `subject: { _id, name }` | none |
| `GET /subject-assignments`, `/:id` | `subject: { _id, name }` | `effectiveCategories: [{ categoryId, name, maxMarks, order }]` |
| `GET /subjects` | – | `defaultCategories` (admin master-data editing only) |
| `GET /categories` | – | `[{ _id, name }]` for "add category" dropdown |

- `categoriesOverride` / `removedCategoryIds` are sent by the client in PATCH/POST and are also present in assignment responses (raw), but clients **display** `effectiveCategories`. When editing, clients must resend the full `removedCategoryIds` list (PATCH replaces it), otherwise earlier removals reappear.
- Month filters use `monthKey` = `"YYYY-MM"`; attendance dates are `"YYYY-MM-DD"` strings.
- Users/profiles returned to clients are sanitized: `_id, name, email, phone, role, isActive, avatar` (+ `profileId` and flattened profile fields, `class`/`section` refs for students). Never password, lock fields, reset tokens/OTP or `refreshTokenVersion`. The profile's own `_id` is returned as `profileId` (Teacher/Student id; absent for admins).
- Auth tokens are never exposed to JS — cookies only.

---

# Part B — Backend

## 11. Structure & Request Pipeline

```
src/
├── app.js  server.js
├── config/db.js
├── middlewares/   asyncHandler, auth, decryptPassword (unused), error, httpLogger,
│                  rateLimiter, requestId, validate
├── modules/<name>/  <name>.model.js · .validator.js · .controller.js · .routes.js · (.helper.js)
│   auth users categories classes sections subjects teachers students
│   subjectAllocations subjectAssignments markSheets progressReports
│   studentAttendance teacherAttendance dashboard
│   upload  ← legacy, NOT mounted
├── utils/   apiError apiResponse sanitize paginate logger cloudinary checkMagicBytes
│            cookieOptions sendToken sendEmail sendOtp
└── views/   email.hbs otp.hbs
seeds/       seed.dev.js (destructive) · seed.prod.js
```

Rules: 1 model = 1 module folder. `auth/` has **no model** — it uses `User` from `users/`. `progressReports/` and `dashboard/` are computed views without models. Helpers hold shared query/validation logic (e.g. `subjectAssignment.helper.js` builds `effectiveCategories`).

**Pipeline (`app.js`):** `httpLogger` → `helmet` → `cors` (origins `LOCALHOST` + `FRONTEND_URL`, `credentials: true`) → `cookieParser` → `express.json` (100kb) → `urlencoded` → `mongoSanitize` → `GET /health` → `/api/v1/*` routers → 404 `ApiError` → global `errorHandler`. Express uses `query parser: extended` and `trust proxy: 1`.

---

## 12. Auth

| Token | Cookie | Lifetime | Secret | Payload |
|-------|--------|----------|--------|---------|
| Access | `token` | `JWT_EXPIRATION` (15m) | `JWT_SECRET` | `{ id, role }` |
| Refresh | `refreshToken` | `JWT_REFRESH_EXPIRATION` (7d) | `JWT_REFRESH_SECRET` | `{ id, role, version }` |

HS256, HttpOnly cookies set by `utils/sendToken.js` (options in `cookieOptions.js`: `secure` + `sameSite: none` in production, `lax` otherwise; `COOKIE_EXPIRATION` in minutes, `COOKIE_REFRESH_EXPIRATION` in days). Login/refresh responses also include the sanitized user + profile.

**Flow**
1. `POST /auth/login { phone, password }` — bcrypt compare, lockout check, sets both cookies.
2. Each request: `isAuthenticatedUser` reads cookie `token`, verifies it, loads the user, rejects inactive users, sets `req.user` (`_id, name, email, phone, role, avatar, createdAt, isActive`).
3. On 401 the client calls `POST /auth/refresh-token`; it verifies the refresh cookie and `decoded.version === user.refreshTokenVersion`, then issues a new pair.
4. `POST /auth/logout` clears both cookies and increments `refreshTokenVersion`. Password change/reset also increments it.
5. `authorizeRoles('admin', 'teacher', …)` guards routes by `req.user.role`. Look up profiles with `Teacher/Student.findOne({ userId: req.user._id })`.

**Password reset**
- Link: `POST /auth/forgot-password { email }` → emailed token → `POST /auth/password/reset/:token`.
- OTP: `POST /auth/forgot-password/otp { email }` → `POST /auth/verify-otp` → `POST /auth/password/reset/otp`.
- Tokens/OTPs are stored SHA-256 hashed with expiry. Rate limits per 15 min: login/verify 20, forgot 5, reset 5, refresh 30.
- Change password: `PUT /auth/password/update` or `PATCH /users/me/password` with `{ oldPassword, newPassword, confirmPassword }`.

There is **no public registration**; admin creates users via `POST /users`. Passwords travel as plaintext over HTTPS (`decryptPassword.middleware` exists but is not wired in).

---

## 13. Conventions

- **Handlers:** `exports.fn = async (req, res, next) => {…}` wrapped by `asyncHandlerMiddleware` in routes. Throw/return `new ApiError(message, status)`.
- **Responses:** always `return ApiResponse.send(res, status, data, message)`. Never `res.json` directly.
- **Sanitizing:** use `utils/sanitize.js` (`sanitizeUser`, `mergeUserProfile`, …). Never return raw user documents.
- **Validation (Zod v4 only):** schemas in `<module>.validator.js`, applied with `validate(schema, 'body' | 'query' | 'params')`; the middleware returns one message per field. Use v4 syntax only:
  - `z.string({ error: (issue) => issue.input === undefined ? 'X is required' : 'X must be a string' })`
  - `z.enum([...], { error: ... })`, `ctx.addIssue({ code: 'custom', message, path })`
  - Never `required_error`, `invalid_type_error`, `errorMap`, `z.ZodIssueCode`.
  - Schemas are `.strict()` — unknown fields are rejected. Query numbers use `z.coerce.number()`.
  - `dateOfBirth: null` must be rejected (`new Date(null)` is 1970).
  - The `validator` package is only for `isEmail` inside the User model.
- **Transactions:** create user + teacher/student profile in one `session.withTransaction`; roll back if either fails.
- **Soft delete:** set `isActive: false`; check usage first and return 409 with a "deactivate instead" message (see §7). Lists for new entries filter `isActive: true`.
- **Pagination:** `utils/paginate.js`; `page` (default 1), `limit` (default 10–20, max 100).
- **Logging:** pino via `utils/logger.js`; no `console.log` in request paths (seed scripts excepted). Each request carries `req.id`.
- **Route order:** declare static routes (`/my`, `/summary`, `/class`, `/bulk`) **before** `/:id`.

---

## 14. Endpoint Reference

Base `/api/v1`; `GET /health` is unprefixed. All routes need `isAuthenticatedUser` except the public auth routes.

### Auth (`/auth`)
Public: `POST /login`, `/forgot-password`, `/forgot-password/otp`, `/verify-otp`, `/password/reset/otp`, `/password/reset/:token`, `/refresh-token`. Logged-in: `POST /logout`, `PUT /password/update`.

### Users (`/users`)
| Route | Roles | Body / notes |
|-------|-------|--------------|
| `GET /me` | any | user + profile |
| `PATCH /me/password` | any | `oldPassword, newPassword, confirmPassword` |
| `POST /` | admin | `name, email, phone, password, role` + teacher: `qualification, dateOfBirth, gender, address` / student: `classId, sectionId, rollNumber, admissionNumber, guardianName, guardianPhone` (+ optional `dateOfBirth, gender, address`). Student fields only for `role: student`; `qualification` only for `teacher` |

### Master data (`/categories`, `/classes`, `/sections`, `/subjects`)
`GET /`, `GET /:id` → admin, teacher. `POST /`, `PATCH /:id`, `DELETE /:id` → admin. `GET /sections` accepts `?classId=`. Subject create/update takes `defaultCategories: [{ categoryId, maxMarks, order }]`.

### People (`/teachers`, `/students`)
- `GET /teachers` admin, teacher · `GET /teachers/:id` admin, teacher · `PATCH`/`DELETE /teachers/:id` admin.
- `GET /students` admin, teacher (`?classId=&sectionId=`) · `GET /students/:id` admin, teacher, student(own) · `PATCH`/`DELETE /students/:id` admin.
- `DELETE` deactivates the user.

### Allocations (`/subject-allocations`)
`POST /`, `PATCH /:id`, `DELETE /:id` admin · `GET /`, `GET /:id` admin, teacher. Body: `subjectId, classId, sectionIds[], semesters[], mainTeacherId`. Responses embed `subject: { _id, name }` only.

### Monthly assignments (`/subject-assignments`)
| Route | Roles | Notes |
|-------|-------|-------|
| `POST /` | admin, teacher | `{ allocationId, semester, calendarMonth, academicYear, categoriesOverride?, removedCategoryIds? }`. Teacher must be the allocation's main teacher. 409 on duplicate |
| `GET /` | admin, teacher | Query: `allocationId, semester, calendarMonth, academicYear, status, page, limit`. Teacher sees own + non-expired shared |
| `GET /:id` | admin, teacher | Includes `effectiveCategories` |
| `PATCH /:id` | admin, teacher(main) | `{ categoriesOverride?, removedCategoryIds?, status? }` (at least one). Blocked if completed; category changes blocked if marks exist |
| `DELETE /:id` | admin | Soft delete; 409 if marks exist |
| `POST /:id/share` | admin, teacher(main) | `{ sharedToTeacherId, sharedUntil? }` |
| `POST /:id/unshare` | admin, teacher(main) | Clears sharing |

### Marks (`/mark-sheets`)
- `POST /bulk` (teacher): `{ assignmentId, sheets: [{ studentId, marks: [{ categoryId, obtainedMarks }] }] }`. Teacher must be the main teacher or hold a non-expired share. Server fills `maxMarks` from the assignment's effective categories, computes totals, and upserts per student.
- `GET /` (admin, teacher, student): `assignmentId, studentId, monthKey (YYYY-MM), page, limit`. Students are restricted to their own records.
- `GET /:id`.

### Progress reports (`/progress-reports`)
- `GET /?studentId=…&monthKey=YYYY-MM` — admin, teacher, student(own).
- `GET /class?classId=…&sectionId=…&monthKey=YYYY-MM` (+ `page`, `limit`) — admin, teacher.

### Student attendance (`/student-attendance`)
- `POST /` (teacher): `{ assignmentId, date: "YYYY-MM-DD", records: [{ studentId, status: "Present"|"Absent", reason? }] }`. Upserts one document per class-section/day; students must belong to the assignment's allocation sections; shared teachers allowed while the share is valid.
- `GET /` (admin, teacher): `classId, sectionId, date, monthKey, page, limit`. `GET /:id` (admin, teacher).
- `GET /summary` (admin, teacher, student) · `GET /my?monthKey=` (student).

### Teacher attendance (`/teacher-attendance`)
`POST /` admin (`{ date, records: [{ teacherId, status, reason? }] }`) · `GET /`, `GET /:id` admin · `GET /summary` admin, teacher · `GET /my?monthKey=` teacher.

### Dashboards (`/dashboard`)
`GET /admin?date=&monthKey=` · `GET /teacher?date=&monthKey=` · `GET /student?monthKey=` — each limited to its own role.

---

## 15. Environment, Commands, Status

**Env vars** (`.env.example`):
```
APP_NAME PORT NODE_ENV LOG_LEVEL API_KEY MONGO_URI
FRONTEND_URL LOCALHOST
JWT_SECRET JWT_EXPIRATION COOKIE_EXPIRATION                       # cookie in minutes
JWT_REFRESH_SECRET JWT_REFRESH_EXPIRATION COOKIE_REFRESH_EXPIRATION   # cookie in days
PASSWORD_ENCRYPTION_KEY PASSWORD_EXPIRE OTP_EXPIRE                # expiries in minutes
LOGIN_LOCK_MINUTES LOGIN_MAX_ATTEMPTS
CLOUDINARY_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET CLOUDINARY_FOLDER_NAME
CLOUDINARY_IMAGE_WIDTH CLOUDINARY_IMAGE_HEIGHT CLOUDINARY_BANNER_WIDTH CLOUDINARY_BANNER_HEIGHT
SMTP_MAIL BREVO_API_KEY
```
For cross-site cookies in production, CORS origins must match the deployed frontend.

**Commands**
```bash
npm install
npm run dev        # nodemon src/server.js -e js hbs
npm start
npm run seed:dev   # DESTRUCTIVE: wipes users/categories/subjects/classes/sections;
                   # seeds admin 9988776655 / Admin@123, demo teacher 8888888888 / Teacher@123,
                   # categories (Words/Reading/Writing), subjects (English, Maths), Classes 1-3 with sections A, B
npm run seed:prod
```

**Status:** all modules (auth, users, master data, teachers, students, allocations, assignments + sharing, mark sheets, progress reports, both attendance modules, dashboards) are built. The frontend is in a separate repo.

**Known gaps**
- `src/modules/upload` (Cloudinary upload) is legacy from another project: not mounted, wrong roles, `express-fileupload` not installed. Rewrite for avatars or delete.
- `API_KEY` and `PASSWORD_ENCRYPTION_KEY` are declared but nothing enforces them.
- No automated tests, no lint script.
- Seeds create no students or allocations; use `POST /users` and the allocation endpoints.
- Previously reported API defects (roll number field name, missing `profileId`, teacher list access, mark-sheet `isActive` filters) are fixed; see the frontend spec §11.

---

## 16. Spec vs Code Differences

The original design doc differed from the implementation in these places; the code is authoritative and this file already reflects it.

| Topic | Original spec | Code |
|-------|---------------|------|
| Student identifier | `rollNo` string, `parentName` | `rollNumber` (number), `admissionNumber`, `guardianName`, `guardianPhone` |
| Mark sheet month field | `month` | `monthKey` (`YYYY-MM`) |
| Assignment status | `pending / in_progress / completed` | `pending / completed` |
| Teacher attendance admin field | `markedBy` | `takenByAdminId` |
| Refresh endpoint | `/auth/refresh` | `POST /auth/refresh-token` |
| User unique indexes | plain unique | unique on phone/email **only among active users** |
| Class/section/subject/category names | unique | unique among active records, case-insensitive |
| Student attendance POST | class + section in body | `assignmentId` + `date` + `records`; class/section derived from the assignment/students |
| Register | – | no public register; admin creates users via `POST /users` |
