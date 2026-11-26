# suffah-model-school-api — CLAUDE.md

## Project Overview

REST API backend for **SUFFAH MODEL SCHOOL** — a school management system covering students, teachers, subject allocation, monthly mark entry, attendance, progress reports and role-based dashboards. Consumed by a Nuxt 4 + Pinia + Tailwind PWA (separate repo).

Stack: Node.js + Express 4 + MongoDB (Mongoose 8) + **Zod v4** for validation. No TypeScript. CommonJS modules. Path alias `@/` → `src/` (via `module-alias`, see `_moduleAliases` in package.json).

Spec files in the repo root (read before changing models, permissions or business rules):
- `suffa.context.md` — domain + backend spec. Part A: roles, permission table, data model, allocation/assignment/sharing rules, flows, API contract. Part B: structure, auth flow, conventions, full endpoint/body reference, env. Follows the code where the original design drifted (see its §16).
- `suffa.frontend.md` — guide for the separate Nuxt 4 PWA that consumes this API.

When you change behaviour, models or endpoints, update the matching spec file(s) too.

## Project Structure

```
src/
├── app.js                  # Middleware order, route mounting
├── server.js               # HTTP server, DB connection, signal handlers
├── config/db.js            # Mongoose connection
├── middlewares/
│   ├── asyncHandler.middleware.js    # Wraps async handlers, forwards errors
│   ├── auth.middleware.js            # isAuthenticatedUser (cookie `token`), authorizeRoles(...roles)
│   ├── decryptPassword.middleware.js # Exists, NOT wired to any route
│   ├── error.middleware.js           # Global error handler
│   ├── httpLogger.middleware.js      # pino-http logger
│   ├── rateLimiter.middleware.js     # authLimiter, forgotPasswordLimiter, resetPasswordLimiter, refreshLimiter
│   ├── requestId.middleware.js       # UUID on req.id
│   └── validate.middleware.js        # Zod validation: validate(schema, 'body'|'query'|'params')
├── modules/                # One folder per resource: *.model / *.validator / *.controller / *.routes (+ *.helper)
│   ├── auth/               # Login, logout, refresh, forgot/reset password (link + OTP). No model.
│   ├── users/              # User model, /me, change password, admin create user (+ profile)
│   ├── categories/ classes/ sections/ subjects/
│   ├── teachers/ students/ # Profile collections linked to users via userId
│   ├── subjectAllocations/ # Long-term: subject + class + sections + semesters + main teacher
│   ├── subjectAssignments/ # Monthly assignment created from an allocation; share/unshare
│   ├── markSheets/         # Bulk upsert + read marks
│   ├── progressReports/    # Per-student and per-class reports (computed)
│   ├── studentAttendance/  # Teacher takes; admin/teacher/student view
│   ├── teacherAttendance/  # Admin takes; teacher views own
│   ├── dashboard/          # admin / teacher / student dashboards
│   └── upload/             # LEGACY (from halls project) — NOT mounted in app.js, references
│                           # non-existent roles and express-fileupload (not a dependency). Don't extend; remove or rewrite.
├── utils/                  # apiError, apiResponse, sanitize, paginate, logger, cloudinary,
│                           # checkMagicBytes, cookieOptions, sendToken, sendEmail, sendOtp
└── views/                  # Handlebars email templates (email.hbs, otp.hbs)
seeds/
├── seed.dev.js             # WIPES users/categories/subjects/classes/sections, seeds admin + sample data
└── seed.prod.js
```

## Roles & Auth

- Roles (lowercase only): `admin`, `teacher`, `student` (student = parent login; same account).
- **Central User + Profile pattern**: name/phone/email/password live ONLY in `users`. `teachers` / `students` hold profile fields and link by `userId` (= JWT `id`). Admin has no profile. Never duplicate name/phone/email into profiles; use `populate('userId', 'name phone email')`.
- Login ID is **phone** (normalized to 10-digit Indian mobile). Email is required + unique but never used for login.
- Create `users` + profile in ONE Mongoose transaction. Never hard-delete users; set `isActive: false`.
- Tokens: access (15m, `JWT_SECRET`, payload `{ id, role }`) in cookie `token`; refresh (7d, `JWT_REFRESH_SECRET`, payload `{ id, role, version }`) in cookie `refreshToken`. HttpOnly, set by `sendToken`. Logout / password change increments `refreshTokenVersion`, invalidating old refresh tokens.
- Login lockout: `LOGIN_MAX_ATTEMPTS` (5) failures → locked `LOGIN_LOCK_MINUTES` (15).
- There is **no self-registration**; admin creates users via `POST /users`. Passwords are sent as plaintext over HTTPS.
- `req.user` is set by `isAuthenticatedUser` (`_id, name, email, phone, role, avatar, createdAt, isActive`); permission checks use `req.user.role`. Look up profiles with `Teacher/Student.findOne({ userId: req.user._id })`.

## API Routes

All prefixed `/api/v1`. Health check: `GET /health` (unprefixed). Every route except the public auth ones requires `isAuthenticatedUser`.

| Group | Routes | Roles |
|-------|--------|-------|
| `/auth` | `POST /login`, `/forgot-password`, `/forgot-password/otp`, `/verify-otp`, `/password/reset/otp`, `/password/reset/:token`, `/refresh-token` | public (rate-limited) |
| `/auth` | `POST /logout`, `PUT /password/update` | any logged-in |
| `/users` | `GET /me`, `PATCH /me/password` | any logged-in |
| `/users` | `POST /` (creates user + teacher/student profile) | admin |
| `/categories` `/classes` `/sections` `/subjects` | `GET /`, `GET /:id` | admin, teacher |
| same | `POST /`, `PATCH /:id`, `DELETE /:id` | admin |
| `/teachers` | `PATCH /:id`, `DELETE /:id` | admin |
| `/teachers` | `GET /`, `GET /:id` | admin, teacher |
| `/students` | `GET /` | admin, teacher |
| `/students` | `GET /:id` | admin, teacher, student |
| `/students` | `PATCH /:id`, `DELETE /:id` | admin |
| `/subject-allocations` | `POST /`, `PATCH /:id`, `DELETE /:id` | admin |
| `/subject-allocations` | `GET /`, `GET /:id` | admin, teacher |
| `/subject-assignments` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `POST /:id/share`, `POST /:id/unshare` | admin, teacher (teacher: own only) |
| `/subject-assignments` | `DELETE /:id` | admin |
| `/mark-sheets` | `POST /bulk` | teacher |
| `/mark-sheets` | `GET /`, `GET /:id` | admin, teacher, student (own) |
| `/progress-reports` | `GET /` | admin, teacher, student (own) |
| `/progress-reports` | `GET /class` | admin, teacher |
| `/student-attendance` | `POST /` (upsert) | teacher |
| `/student-attendance` | `GET /`, `GET /:id` | admin, teacher |
| `/student-attendance` | `GET /summary` | admin, teacher, student |
| `/student-attendance` | `GET /my` | student |
| `/teacher-attendance` | `POST /`, `GET /`, `GET /:id` | admin |
| `/teacher-attendance` | `GET /summary` | admin, teacher |
| `/teacher-attendance` | `GET /my` | teacher |
| `/dashboard` | `GET /admin`, `/teacher`, `/student` | matching role |

Declare static paths (`/my`, `/summary`, `/class`, `/bulk`) before `/:id` routes.

## Domain Rules (see suffa.context.md for full detail)

- **Two-layer assignment**: `SubjectAllocation` (who teaches what to whom, whole year; sections can't change once assignments exist) → `SubjectAssignment` (one per allocation + semester + calendarMonth + academicYear). Assignment snapshots `mainTeacherId` from the allocation; later allocation changes don't alter old assignments.
- **Effective categories** = subject `defaultCategories` − `removedCategoryIds` + `categoriesOverride`. Frontend uses the assignment's `effectiveCategories`, never `subject.defaultCategories`.
- **Sharing** lives on the assignment (`sharedToTeacherId`, `sharedUntil`, `sharedBy`), not the allocation.
- **MarkSheet**: one doc per student per assignment/month/semester with all category marks in an array; `total`/`totalMax` computed. `month` is `"YYYY-MM"`. Entered via `POST /mark-sheets/bulk` by teacher only. Marks are history — never delete.
- **Attendance**: one doc per class+section+day (student) or per day (teacher); `date` is a `"YYYY-MM-DD"` string; status `Present`/`Absent` (capitalized), default Present; totals computed.
- **Soft delete only** for master data (`isActive: false`). Block delete if the record is referenced (allocation with assignments, assignment with mark sheets, etc.) and tell the user to deactivate instead. Dropdown/list queries for new entries filter `isActive: true`.
- Assignment categories can't change once mark sheets exist.

## Key Conventions

- **Errors**: `throw new ApiError(message, statusCode)` in handlers; wrap handlers with `asyncHandlerMiddleware`.
- **Responses**: always `return ApiResponse.send(res, status, data, message)` → `{ success, statusCode, data, message }`. Never `res.json(...)` directly.
- **Never return raw Mongoose docs** for users/profiles; use helpers in `utils/sanitize.js` (`sanitizeUser`, `mergeUserProfile`, …). Never expose password, lock fields, reset tokens/OTP, `refreshTokenVersion`.
- **Validation**: **Zod v4 only** (no Joi/express-validator). Schemas in `*.validator.js` next to the module; use `validate(schema, target)`. Use v4 syntax: `z.string({ error: ... })` / `error: (issue) => ...`, `ctx.addIssue({ code: 'custom', ... })` — never `required_error`, `invalid_type_error`, `errorMap`, `z.ZodIssueCode`. `rollNo` is a string. Block `dateOfBirth: null` (would coerce to 1970).
- **Auth guard**: `isAuthenticatedUser` then `authorizeRoles('admin', ...)` per route.
- **Logging**: use `utils/logger.js` (pino); no `console.log` in request paths (seed scripts excepted).
- **Pagination**: use `utils/paginate.js`; list endpoints take `page`/`limit` (limit max 100).
- **Security middleware order** (app.js): logger → helmet → CORS (credentials, origins from `LOCALHOST`/`FRONTEND_URL`) → cookie-parser → JSON (100kb) → mongo-sanitize → routes → 404 → error handler.
- Mongoose model name for users is `User`; every `ref` to users is `'User'` (there is no `Auth` model).

## Environment Variables

See `.env.example`:

```
APP_NAME PORT NODE_ENV LOG_LEVEL API_KEY MONGO_URI
FRONTEND_URL LOCALHOST
JWT_SECRET JWT_EXPIRATION COOKIE_EXPIRATION            # minutes (default 15)
JWT_REFRESH_SECRET JWT_REFRESH_EXPIRATION COOKIE_REFRESH_EXPIRATION   # days (default 7)
PASSWORD_ENCRYPTION_KEY PASSWORD_EXPIRE OTP_EXPIRE     # expiries in minutes (default 10)
LOGIN_LOCK_MINUTES LOGIN_MAX_ATTEMPTS
CLOUDINARY_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET CLOUDINARY_FOLDER_NAME
CLOUDINARY_IMAGE_WIDTH CLOUDINARY_IMAGE_HEIGHT CLOUDINARY_BANNER_WIDTH CLOUDINARY_BANNER_HEIGHT
SMTP_MAIL BREVO_API_KEY                                 # Brevo transactional email / OTP
```

`API_KEY` and `PASSWORD_ENCRYPTION_KEY` are declared but no active middleware currently enforces them.

## Development

```bash
npm install
npm run dev         # nodemon src/server.js (watches .js, .hbs)
npm start           # production
npm run seed:dev    # DESTRUCTIVE: wipes users/categories/subjects/classes/sections, seeds admin 9988776655 / Admin@123
npm run seed:prod
```

No test or lint scripts are configured. Node >= 18.
