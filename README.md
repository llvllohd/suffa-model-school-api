# Suffah Model School API

Backend REST API for **SUFFAH MODEL SCHOOL** — a school management system for students, teachers, subject allocation, monthly marks, attendance and progress reports.

Built with Node.js, Express and MongoDB. The companion frontend is a Nuxt 4 PWA.

## Features

- Phone + password login with JWT access token (15m) and rotating refresh token (7d), both in HttpOnly cookies
- Refresh-token versioning: logout or password change invalidates old refresh tokens
- Account lockout after repeated failed logins (default 5 attempts, 15 min)
- Forgot/reset password by email link or OTP (Brevo)
- Role-based access: `admin`, `teacher`, `student` (parent shares the student login)
- Central User + Profile model: one login per person, with teacher/student profiles linked by `userId`
- Master data: classes, sections, subjects, mark categories
- Two-layer teaching setup: long-term **subject allocations** and **monthly subject assignments** (with per-month category overrides and teacher sharing for absences)
- Bulk mark entry per student per month and semester, with computed totals
- Student attendance (class/section/day) and teacher attendance (day), plus summaries
- Computed progress reports per student and per class
- Role-specific dashboards (admin, teacher, student)
- Soft delete for master data, with delete blocked when records are in use
- Zod v4 request validation, pino logging, rate limiting, helmet, NoSQL-injection sanitization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Framework | Express 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | jsonwebtoken, bcryptjs (12 rounds), cookie-parser |
| Validation | Zod v4 |
| Email | Brevo (`sib-api-v3-sdk`) + Handlebars templates |
| Logging | pino + pino-http |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize |

## Getting Started

```bash
npm install
cp .env.example .env     # fill in values
npm run dev              # development (nodemon)
npm start                # production
```

Seed data:

```bash
npm run seed:dev   # WARNING: wipes users, categories, subjects, classes, sections
npm run seed:prod
```

The dev seed creates an admin: phone `9988776655`, password `Admin@123`. Change it outside local development.

### Environment variables

See [.env.example](.env.example). Key groups:

| Group | Variables |
|-------|-----------|
| App | `APP_NAME`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `MONGO_URI`, `API_KEY` |
| CORS | `FRONTEND_URL`, `LOCALHOST` |
| JWT / cookies | `JWT_SECRET`, `JWT_EXPIRATION`, `COOKIE_EXPIRATION` (minutes), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`, `COOKIE_REFRESH_EXPIRATION` (days) |
| Password / OTP | `PASSWORD_ENCRYPTION_KEY`, `PASSWORD_EXPIRE`, `OTP_EXPIRE` (minutes) |
| Login lock | `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES` |
| Cloudinary | `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER_NAME`, image/banner width and height |
| Email | `SMTP_MAIL`, `BREVO_API_KEY` |

## Response Format

All responses use the same envelope:

```json
{ "success": true, "statusCode": 200, "data": { }, "message": "Success" }
```

Errors return `success: false` with an appropriate status code and message. Validation errors report one message per field.

## API Reference

Base path: `/api/v1`. Health check: `GET /health`.

Authentication is via the `token` cookie set at login. "Own" means the caller only sees or changes their own records.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | - | Login with phone + password, sets cookies |
| POST | `/auth/logout` | any | Clear cookies, invalidate refresh tokens |
| POST | `/auth/refresh-token` | - | Rotate access + refresh tokens |
| POST | `/auth/forgot-password` | - | Send reset link by email |
| POST | `/auth/password/reset/:token` | - | Reset password via emailed token |
| POST | `/auth/forgot-password/otp` | - | Send reset OTP by email |
| POST | `/auth/verify-otp` | - | Verify OTP |
| POST | `/auth/password/reset/otp` | - | Reset password using OTP |
| PUT | `/auth/password/update` | any | Change own password |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | any | Own user + profile |
| PATCH | `/users/me/password` | any | Change own password |
| POST | `/users` | admin | Create an admin, teacher or student (with profile) |

There is no public registration; the admin creates all accounts.

### Master data

`categories`, `classes`, `sections` and `subjects` share the same shape:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/{resource}` | admin, teacher | List |
| GET | `/{resource}/:id` | admin, teacher | Get one |
| POST | `/{resource}` | admin | Create |
| PATCH | `/{resource}/:id` | admin | Update |
| DELETE | `/{resource}/:id` | admin | Soft delete (blocked if in use) |

### Teachers and students

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/teachers` | admin, teacher | List teachers |
| GET | `/teachers/:id` | admin, teacher | Get teacher |
| PATCH | `/teachers/:id` | admin | Update teacher |
| DELETE | `/teachers/:id` | admin | Deactivate teacher |
| GET | `/students` | admin, teacher | List students (filterable, paginated) |
| GET | `/students/:id` | admin, teacher, student (own) | Get student |
| PATCH | `/students/:id` | admin | Update student |
| DELETE | `/students/:id` | admin | Deactivate student |

### Subject allocations and monthly assignments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/subject-allocations` | admin | Allocate subject + class + sections + semesters to a main teacher |
| GET | `/subject-allocations` | admin, teacher | List allocations |
| GET | `/subject-allocations/:id` | admin, teacher | Get allocation |
| PATCH | `/subject-allocations/:id` | admin | Update allocation |
| DELETE | `/subject-allocations/:id` | admin | Delete (blocked if assignments exist) |
| POST | `/subject-assignments` | admin, teacher (own allocation) | Create monthly assignment |
| GET | `/subject-assignments` | admin, teacher | List (filter by `academicYear`, `semester`, `calendarMonth`, `allocationId`) |
| GET | `/subject-assignments/:id` | admin, teacher | Get with effective categories |
| PATCH | `/subject-assignments/:id` | admin, teacher (own) | Update categories / status |
| DELETE | `/subject-assignments/:id` | admin | Delete (blocked if mark sheets exist) |
| POST | `/subject-assignments/:id/share` | admin, teacher (own) | Share with another teacher for a period |
| POST | `/subject-assignments/:id/unshare` | admin, teacher (own) | Revoke share |

### Marks and reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/mark-sheets/bulk` | teacher | Create/update marks for many students |
| GET | `/mark-sheets` | admin, teacher, student (own) | List mark sheets |
| GET | `/mark-sheets/:id` | admin, teacher, student (own) | Get mark sheet |
| GET | `/progress-reports` | admin, teacher, student (own) | Student progress report |
| GET | `/progress-reports/class` | admin, teacher | Class-wide progress reports |

### Attendance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/student-attendance` | teacher | Take/update a class-section's daily attendance |
| GET | `/student-attendance` | admin, teacher | List records |
| GET | `/student-attendance/:id` | admin, teacher | Get record |
| GET | `/student-attendance/summary` | admin, teacher, student | Attendance summary |
| GET | `/student-attendance/my` | student | Own attendance |
| POST | `/teacher-attendance` | admin | Take/update daily teacher attendance |
| GET | `/teacher-attendance` | admin | List records |
| GET | `/teacher-attendance/:id` | admin | Get record |
| GET | `/teacher-attendance/summary` | admin, teacher | Attendance summary |
| GET | `/teacher-attendance/my` | teacher | Own attendance |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/admin` | admin | School-wide overview |
| GET | `/dashboard/teacher` | teacher | Own assignments and classes |
| GET | `/dashboard/student` | student | Own marks and attendance |

## Project Structure

```
src/
├── app.js, server.js
├── config/          # DB connection
├── middlewares/     # auth, validation, rate limiting, logging, errors
├── modules/         # one folder per resource: model, validator, controller, routes
├── utils/           # ApiError, ApiResponse, sanitizers, pagination, email/OTP, tokens
└── views/           # Handlebars email templates
seeds/               # seed.dev.js, seed.prod.js
suffa.context.md     # Domain + backend spec: roles, permissions, data model, rules, auth, endpoints
suffa.frontend.md    # Guide for the Nuxt 4 PWA frontend (separate repo)
```

## Notes

- `src/modules/upload` is leftover code from an earlier project and is not mounted.
- `API_KEY` and `PASSWORD_ENCRYPTION_KEY` are defined in `.env.example` but not currently enforced by any middleware.
- No test or lint scripts are configured yet.

## License

UNLICENSED — private project.
