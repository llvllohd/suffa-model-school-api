# SUFFAH MODEL SCHOOL — Frontend Build Spec (`suffa-pwa`)

**Purpose of this file:** an AI agent (or developer) can read only this file plus the backend repo and generate a complete, running frontend. Domain rules (roles, permissions, data model, flows) are in [suffa.context.md](suffa.context.md); this file is the build recipe and the exact API contract as the backend **actually behaves today**.

**Stack (fixed):** Nuxt 4 (SPA mode) · Vue 3 · Pinia · Tailwind CSS v4 · `@vite-pwa/nuxt` · plain JavaScript (no TypeScript) · no UI component library.

---

## 0. Instructions to the building agent

1. Work **in order** through §1 → §10. After each numbered step in §10 run its check; do not continue while a check fails.
2. Create the project in a **new sibling directory** `suffa-pwa/` (not inside the API repo).
3. Use **only** endpoints, fields and shapes in §6–§7. Do not invent endpoints. If something needed is missing, see §11 (known backend gaps) and follow the stated workaround.
4. Treat every response field marked *defensive* as possibly absent or shaped two ways; use the helpers in §5.5.
5. Never store tokens in JS (cookies are HttpOnly). Never use `localStorage` for auth.
6. Keep the UI mobile-first (teachers use phones). No external UI libraries; Tailwind utility classes only.
7. When done, run the full §10 checklist and report which items pass.

---

## 1. Prerequisites

| Need | Detail |
|------|--------|
| Node.js | 20.19+ (22 LTS recommended) and npm 10+ |
| Backend | `suffa-model-school-api` running at `http://localhost:5000`, MongoDB connected, seeded (`npm run seed:dev` in the API repo) |
| Backend `.env` | `LOCALHOST=http://localhost:3000` and `FRONTEND_URL=http://localhost:3000` (CORS allow-list). `NODE_ENV=development` so cookies are `SameSite=Lax`, non-secure |
| Seeded logins | Admin `9988776655` / `Admin@123` · Teacher `8888888888` / `Teacher@123`. No student is seeded: create one in the UI as admin (§7.3) |

Always open the app at `http://localhost:3000` (not `127.0.0.1`) so cookies and CORS match `localhost`.

---

## 2. Bootstrap

Do **not** use an interactive scaffolder. Create the files below by hand.

```
suffa-pwa/
├── package.json
├── nuxt.config.ts
├── .env.example          .env  (copy)
├── .gitignore
├── scripts/make-icons.mjs
├── public/icons/         (generated)
└── app/ ...              (§4)
```

### 2.1 `package.json`
```json
{
  "name": "suffa-pwa",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "icons": "node scripts/make-icons.mjs",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@pinia/nuxt": "^0.11.0",
    "@tailwindcss/vite": "^4.0.0",
    "@vite-pwa/nuxt": "^1.0.0",
    "nuxt": "^4.0.0",
    "pinia": "^3.0.0",
    "tailwindcss": "^4.0.0",
    "vue": "^3.5.0",
    "vue-router": "^4.5.0"
  }
}
```
Run `npm install`. If npm reports a peer-dependency conflict, run `npm ls`, bump the conflicting package to the newest version that satisfies the peer range, and note the change in the project README. Do not use `--force`.

### 2.2 `.env.example` (copy to `.env`)
```
NUXT_PUBLIC_API_BASE=http://localhost:5000/api/v1
```

### 2.3 `.gitignore`
```
node_modules
.nuxt
.output
dist
.env
```

### 2.4 `nuxt.config.ts`
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // SPA: auth is cookie-based and the API is on another origin
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: {
    public: { apiBase: 'http://localhost:5000/api/v1' }, // override with NUXT_PUBLIC_API_BASE
  },
  app: {
    head: {
      title: 'Suffah Model School',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#047857' },
      ],
      link: [{ rel: 'icon', href: '/icons/icon-192.png' }],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Suffah Model School',
      short_name: 'Suffah',
      description: 'Marks, attendance and progress reports',
      theme_color: '#047857',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // API calls are cross-origin and have no runtimeCaching rule: they always hit the network.
    },
    devOptions: { enabled: false },
  },
})
```

### 2.5 `app/assets/css/main.css`
```css
@import "tailwindcss";

@theme {
  --color-brand-50: #ecfdf5;
  --color-brand-100: #d1fae5;
  --color-brand-600: #059669;
  --color-brand-700: #047857;
  --color-brand-800: #065f46;
}

html, body, #__nuxt { min-height: 100%; }
body { @apply bg-slate-50 text-slate-900 antialiased; }
```

### 2.6 `scripts/make-icons.mjs` (placeholder PWA icons, no dependencies)
```js
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const table = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}
const png = (size, [r, g, b]) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b }
  const raw = Buffer.concat(Array(size).fill(row))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, png(size, [4, 120, 87]))
console.log('icons written to public/icons')
```
Run `npm run icons` once. Replace with real artwork later.

---

## 3. First run check

```bash
npm install
npm run icons
cp .env.example .env
npm run dev          # http://localhost:3000
```
Expected: the app serves on port 3000 and redirects to `/login`. Verify CORS from the backend side:
```bash
curl -i -X OPTIONS http://localhost:5000/api/v1/auth/login \
  -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST"
```
The response must include `Access-Control-Allow-Origin: http://localhost:3000` and `Access-Control-Allow-Credentials: true`. If not, fix the backend `.env` (§1) and restart it.

---

## 4. File map (create all)

```
app/
├── app.vue                         <NuxtLayout><NuxtPage/></NuxtLayout> + <AppToast/>
├── assets/css/main.css
├── layouts/
│   ├── default.vue                 header + role nav (bottom tab bar on mobile) + logout
│   └── auth.vue                    centered card, used by login/forgot/reset
├── middleware/auth.global.js       §5.3
├── composables/
│   ├── useApi.js                   §5.1
│   ├── useToast.js                 simple global toast state (useState) + push(message, type)
│   └── useLookups.js               cached GET of classes/sections/subjects/categories
├── stores/
│   ├── auth.js                     §5.2
│   ├── assignments.js              my/shared assignment lists + selected assignment
│   ├── marks.js                    mark sheets for open assignment
│   └── attendance.js               attendance draft + summaries
├── utils/
│   ├── apiError.js                 ApiError class
│   ├── format.js                   dates, monthKey, percentages, personName, phone helpers (§5.5)
│   └── nav.js                      role → nav items
├── components/
│   ├── AppToast.vue  AppSpinner.vue  EmptyState.vue  ErrorState.vue
│   ├── PageHeader.vue              title + optional action slot
│   ├── DataTable.vue               responsive table → stacked cards on mobile
│   ├── ConfirmDialog.vue  Modal.vue
│   ├── MonthPicker.vue             emits monthKey "YYYY-MM"
│   ├── StatCard.vue  PercentBar.vue
│   ├── AttendanceRow.vue           name + Present/Absent toggle + reason input
│   └── MarksGrid.vue               students × categories inputs
└── pages/                          §7
```

Every page that loads data must show: loading (spinner), error (message + retry), empty (EmptyState) and success states. Every mutation must disable its button while pending and toast the server `message` on success or error.

---

## 5. Core infrastructure (copy exactly, then build pages on top)

### 5.1 `app/utils/apiError.js` and `app/composables/useApi.js`
```js
// app/utils/apiError.js
export class ApiError extends Error {
  constructor(message, statusCode = 0, errors = []) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errors = errors // [{ field, message }] on validation errors
  }
}
```
```js
// app/composables/useApi.js
let refreshPromise = null // shared so concurrent 401s trigger one refresh

export function useApi() {
  const apiBase = useRuntimeConfig().public.apiBase

  async function refresh() {
    refreshPromise ??= $fetch('/auth/refresh-token', {
      baseURL: apiBase, method: 'POST', credentials: 'include', retry: false,
    }).then(() => true).catch(() => false).finally(() => { refreshPromise = null })
    return refreshPromise
  }

  async function request(method, path, { body, query, silent = false } = {}, retried = false) {
    try {
      const res = await $fetch(path, {
        baseURL: apiBase, method, body, query, credentials: 'include', retry: false,
      })
      return res?.data ?? null // unwrap { success, statusCode, data, message }
    } catch (err) {
      const status = err?.statusCode ?? err?.response?.status ?? 0
      const payload = err?.data
      if (status === 401 && !retried && !path.startsWith('/auth/')) {
        if (await refresh()) return request(method, path, { body, query, silent }, true)
        if (!silent) {
          useAuthStore().clear()
          await navigateTo('/login')
        }
      }
      const message = payload?.message
        || (status === 0 ? 'Cannot reach the server. Check your connection.' : 'Something went wrong. Please try again.')
      throw new ApiError(message, status, payload?.errors)
    }
  }

  return {
    get: (path, query, opts) => request('GET', path, { query, ...opts }),
    post: (path, body, opts) => request('POST', path, { body, ...opts }),
    put: (path, body, opts) => request('PUT', path, { body, ...opts }),
    patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
    del: (path, opts) => request('DELETE', path, { ...opts }),
  }
}
```
Success returns the envelope's `data` object (e.g. `const { students } = await api.get('/students')`). The envelope's `message` is **not** returned; toast fixed success wording yourself (e.g. "Saved"). Errors throw `ApiError` whose `message` is user-readable.

### 5.2 `app/stores/auth.js`
```js
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, ready: false }),
  getters: {
    isLoggedIn: (s) => !!s.user,
    role: (s) => s.user?.role ?? null,
  },
  actions: {
    async init() {
      if (this.ready) return
      try {
        const data = await useApi().get('/users/me', undefined, { silent: true })
        this.user = data.user
      } catch {
        this.user = null
      } finally {
        this.ready = true
      }
    },
    async login(phone, password) {
      const data = await useApi().post('/auth/login', { phone, password })
      this.user = data.user
      this.ready = true
      return data.user
    },
    async logout() {
      try { await useApi().post('/auth/logout') } catch { /* ignore */ }
      this.clear()
      await navigateTo('/login')
    },
    clear() { this.user = null },
  },
})
```
Only the user object lives in Pinia. No tokens anywhere.

### 5.3 `app/middleware/auth.global.js`
```js
const PUBLIC = ['/login', '/forgot-password']

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  await auth.init()
  const isPublic = PUBLIC.includes(to.path) || to.path.startsWith('/reset-password/')

  if (!auth.isLoggedIn && !isPublic) return navigateTo('/login')
  if (auth.isLoggedIn && isPublic) return navigateTo('/')
  const roles = to.meta.roles
  if (roles && !roles.includes(auth.role)) return navigateTo('/')
})
```
Pages declare access with `definePageMeta({ roles: ['admin'] })`; public pages use `definePageMeta({ layout: 'auth' })`.

### 5.4 Role navigation (`app/utils/nav.js`)
| Role | Items (label → route) |
|------|-----------------------|
| admin | Dashboard `/` · Users `/admin/users` · Classes `/admin/classes` · Sections `/admin/sections` · Subjects `/admin/subjects` · Categories `/admin/categories` · Allocations `/admin/allocations` · Assignments `/assignments` · Teacher attendance `/teacher-attendance` · Class reports `/reports/class` · Profile `/profile` |
| teacher | Dashboard `/` · Assignments `/assignments` · My attendance `/teacher-attendance/my` · Class reports `/reports/class` · Profile `/profile` |
| student | Dashboard `/` · My progress `/progress` · My attendance `/attendance/my` · Profile `/profile` |

Mobile: bottom tab bar with the first 4 items + "More" sheet. Desktop (`md:`): left sidebar.

### 5.5 Helpers (`app/utils/format.js`) — required behaviour
- `normalizePhone(input)`: strip non-digits; if 12 digits starting `91` drop it; if 11 digits starting `0` drop it; return the 10-digit string.
- `isValidPhone(p)`: `/^[6-9]\d{9}$/`.
- `todayISO()` → `"YYYY-MM-DD"` in **local** time. `currentMonthKey()` → `"YYYY-MM"` local.
- `monthKeyOf(academicYear, calendarMonth)` → `"YYYY-MM"` zero-padded.
- `MONTHS` array of 12 names; `monthLabel(n)`.
- `pct(a, b)` → one-decimal number, 0 when `b` is 0.
- `personName(x)` → `x?.user?.name ?? x?.userId?.name ?? x?.name ?? '—'` (the API embeds people in three shapes, §6.3).
- `idOf(x)` → `String(x?._id ?? x)` (any ref may be an id string or a populated object — *defensive*).
- `gradeColor(grade)` for report badges.

---

## 6. API contract (as implemented)

### 6.1 Envelope, errors, pagination
- Success: `{ success: true, statusCode, data, message }`. `data` is an object keyed by resource, or `null`.
- Error: HTTP status ≥ 400 with `{ success: false, message, requestId, errors? }`; `errors` is `[{ field, message }]` for validation (400). Show `message`.
- Status handling: `401` → refresh once, then login · `403` → toast "You are not allowed to do that" · `404` → show EmptyState/not found · `409` → show `message` verbatim (duplicate, blocked delete) · `429` → "Too many attempts, wait and retry".
- **Paginated lists** return `{ <plural>: [...], pagination: { total, page, pages, limit, hasNextPage, hasPrevPage } }`. Query `page` (1-based) and `limit` (max 100). Endpoints: subject-allocations, subject-assignments, mark-sheets, student-attendance, teacher-attendance, progress-reports/class.
- **Unpaginated lists** (return only `{ <plural>: [...] }`): classes, sections, subjects, categories, teachers, students.
- All request bodies are validated `.strict()`: **send only the documented fields**; unknown fields cause 400.
- IDs are 24-char hex strings. Dates: attendance `"YYYY-MM-DD"` strings; `monthKey` `"YYYY-MM"`; other dates ISO strings.

### 6.2 Who am I — `GET /users/me` and the `/auth/login` response
`data.user` is flat (user + profile merged):
```
{ _id, name, email, phone, role, avatar /*url|null*/, isActive,
  // teacher: qualification?, dateOfBirth?, gender?, address?
  // student: rollNumber?, admissionNumber?, guardianName?, guardianPhone?, dateOfBirth?, gender?, address?,
  //          class?: { _id, name }, section?: { _id, name } }
```
Fields that are null/undefined are omitted. `profileId` is the Teacher `_id` / Student `_id` (absent for admins). Use it for `studentId` / `teacherId` query params.

### 6.3 Entity shapes (*defensive*: handle `_id` strings and populated objects via `idOf`)
| Entity | Shape |
|--------|-------|
| Class | `{ _id, name, description, isActive }` |
| Section | `{ _id, classId /*id or {_id,name}*/, name, isActive }` |
| Category | `{ _id, name, isActive }` |
| Subject | `{ _id, name, isActive, defaultCategories: [{ categoryId /*id or {_id,name}*/, maxMarks, order }] }` |
| Teacher (`/teachers`) | `{ _id /*Teacher id*/, qualification, dateOfBirth, gender, address, user: { _id, name, email, phone, role, avatar, isActive } }` |
| Student (`/students`) | `{ _id /*Student id*/, rollNumber, admissionNumber, guardianName, guardianPhone, dateOfBirth, gender, address, user: { _id, name, phone, role, avatar, isActive }, class: { _id, name }, section: { _id, name } }` |
| Allocation | `{ _id, subject: {_id,name}, class: {_id,name}, sections: [{_id,name}], mainTeacher: Teacher, semesters: [1,2], isActive }` |
| Assignment | `{ _id, semester, calendarMonth, monthLabel, academicYear, status: 'pending'\|'completed', isActive, sharedUntil, allocation: { _id, subject, class, sections, semesters }, subject, mainTeacher: Teacher, sharedToTeacher: Teacher\|null, sharedBy, effectiveCategories: [{ categoryId, name, maxMarks, order }], categoriesOverride, removedCategoryIds }` |
| MarkSheet | `{ _id, assignment: { _id, semester, calendarMonth, academicYear, status }, student: { _id, classId, sectionId, userId: { _id, name, phone, email } }, enteredByTeacher: Teacher, semester, monthKey, marks: [{ categoryId, name, obtainedMarks, maxMarks }], total, totalMax }` |
| StudentAttendance | `{ _id, date, classId: {_id,name}, sectionId: {_id,name}, totalPresent, totalAbsent, takenByTeacher: Teacher, records: [{ student: { _id, classId, sectionId, userId: {_id,name,phone,email} }, status: 'Present'\|'Absent', reason }] }` |
| TeacherAttendance | `{ _id, date, totalPresent, totalAbsent, takenByAdmin: {_id,name,email}, records: [{ teacher: { _id, userId: {_id,name,…} }, status, reason }] }` |

**Name resolution:** people appear as `.user.name` (Teacher/Student endpoints), `.userId.name` (inside mark sheets and attendance records) or `.name`. Always call `personName(entity)`.

### 6.4 Computed payloads
- **Progress report** `GET /progress-reports` → `{ progressReport: { student: {_id, rollNumber, name, phone}, classId, sectionId, semester, monthKey, subjects: [{ assignmentId, subject: {_id,name}, total, totalMax, percentage, grade, marks: [{ categoryId, name, obtainedMarks, maxMarks }] }], overall: { total, totalMax, percentage, grade } } }`. 404 when no marks for that month.
- **Class reports** `GET /progress-reports/class` → `{ progressReports: [ …report-like rows incl. rank… ], pagination }`. Render columns generically from the keys present (name, overall %, grade, rank when available).
- **Student attendance** `GET /student-attendance/my?monthKey` → `{ attendance: { monthKey, totalDays, totalPresent, totalAbsent, percentage, records: [{ date, status, reason }] } }`. `GET /student-attendance/summary?studentId&monthKey` → `{ attendance: { studentId, monthKey, totalDays, totalPresent, totalAbsent, percentage, absentDays: [{ date, reason }] } }`.
- **Teacher attendance** `GET /teacher-attendance/my?monthKey` → same as student `my`. `GET /teacher-attendance/summary?teacherId&monthKey` → `{ attendance: { teacherId, monthKey, …, absentDays } }`.
- **Dashboards** (all under `data.dashboard`):
  - admin: `{ date, monthKey, counts: { totalStudents, totalTeachers, totalClasses, totalSubjects, totalAssignments, totalMarkSheets }, today: { studentAttendance: { total, present, absent, percentage, classesTaken }, teacherAttendance: { total, present, absent, percentage, taken } }, month: { studentAttendance: {…}, teacherAttendance: {…} } }`
  - teacher: `{ date, monthKey, counts: { myClasses, myAllocations, myAssignments }, today: { classesTaken, pendingToday }, month: { classesTaken }, myAttendance: { totalDays, totalPresent, totalAbsent, percentage } }`
  - student: `{ monthKey, student: { className, sectionName, rollNumber }, myAttendance: { totalDays, totalPresent, totalAbsent, percentage }, latestMarkSheet: object|null }`

---

## 7. Pages (route · roles · behaviour · endpoints)

Role abbreviations: **A** admin, **T** teacher, **S** student. Use `definePageMeta({ roles })`.

### 7.1 Public (layout `auth`)
| Route | Behaviour |
|-------|-----------|
| `/login` | Phone (10-digit, normalized with `normalizePhone`) + password with show/hide. `POST /auth/login { phone, password }` → `auth.user`, go to `/`. Show server message for wrong credentials and for the lockout (5 failures → 15 min). Link to forgot password |
| `/forgot-password` | Two tabs. **Link**: `POST /auth/forgot-password { email }`. **OTP**: step 1 `POST /auth/forgot-password/otp { email }`; step 2 `POST /auth/verify-otp { email, otp }` → `{ otpSessionToken }`; step 3 `POST /auth/password/reset/otp { otpSessionToken, password, confirmPassword }`. The server always answers 200 "email sent" (no account enumeration), so never say whether the email exists |
| `/reset-password/[token]` | `POST /auth/password/reset/:token { password, confirmPassword }`. The emailed link is `${FRONTEND_URL}/reset-password/<token>`. Note the field is `password`, not `newPassword` (only the logged-in change-password endpoints use `oldPassword/newPassword/confirmPassword`) |

### 7.2 Shared (A, T, S)
| Route | Behaviour |
|-------|-----------|
| `/` | Role dashboard. A: `GET /dashboard/admin` — stat cards for `counts`, today/month attendance cards with `PercentBar`, banner "Teacher attendance not taken today" with button to `/teacher-attendance` when `today.teacherAttendance.taken` is false. T: `GET /dashboard/teacher` + `GET /subject-assignments?limit=100` split into **My Assignments** (`mainTeacher._id` equals own teacher id) and **Shared With Me** (others); each card: subject, class + sections, month label, status badge, buttons **Fill Marks** `/marks/:id`, **Attendance** `/attendance/:id`, **Share** (own only). S: `GET /dashboard/student?monthKey=` — class/section, attendance %, latest mark sheet summary, links to `/progress`, `/attendance/my`. All accept a `MonthPicker` (`monthKey`) |
| `/profile` | Show `auth.user`. Change password: `PATCH /users/me/password { oldPassword, newPassword, confirmPassword }`; on success the server invalidates refresh tokens → call `auth.logout()` equivalent flow (redirect to login) |

### 7.3 Admin
| Route | Behaviour |
|-------|-----------|
| `/admin/users` | Tabs **Teachers** / **Students** / **Create**. Lists: `GET /teachers`, `GET /students?classId&sectionId` (filters via class/section selects). Row actions: edit (modal → `PATCH /teachers/:id` or `/students/:id` — read `updateTeacherSchema`/`updateStudentSchema` in the API repo for allowed fields; email/phone/password cannot be changed there), deactivate (`DELETE`, confirm dialog). **Create** form → `POST /users`: common `name, email, phone, password, role`; role `teacher` adds optional `qualification, dateOfBirth, gender, address`; role `student` requires `classId, sectionId` (section select filtered by class), `rollNumber`, `admissionNumber`, `guardianName`, `guardianPhone` (+ optional `dateOfBirth, gender, address`). `rollNumber` is a **number**. Show field errors from `ApiError.errors`. Role `admin` also allowed |
| `/admin/classes`, `/admin/sections`, `/admin/categories` | Generic CRUD (see §7.4). Sections form has a class select; `GET /sections?classId=` filter |
| `/admin/subjects` | CRUD plus editor for `defaultCategories`: rows of (category select from `GET /categories`, `maxMarks` number ≥ 1, `order` number). This is the **only** place `defaultCategories` is used |
| `/admin/allocations` | List `GET /subject-allocations?page&limit`; create/edit modal → `POST` / `PATCH /subject-allocations/:id` with `{ subjectId, classId, sectionIds[], semesters[], mainTeacherId }` (class select → section checkboxes; semesters checkboxes 1/2; teacher select from `GET /teachers`, value = Teacher `_id`). Delete with confirm; show 409 message ("has assignments, deactivate instead") |
| `/teacher-attendance` | Date picker (default today). Load `GET /teachers` and `GET /teacher-attendance?date=` (first item if any → prefill). All teachers default Present; toggle Absent shows optional reason (≤200 chars; quick chips: Sick, Family trip). Save → `POST /teacher-attendance { date, records: [{ teacherId, status, reason }] }` (all teachers). After save, if any absent, show link "Share their assignments" → `/assignments?teacher=<id>` (filter client-side by `mainTeacher._id`). History: `GET /teacher-attendance?monthKey=` list below. `date` and `monthKey` are mutually exclusive: sending both returns 400 |

### 7.4 Generic master-data CRUD pattern (classes, sections, categories, subjects)
- List: `GET /<resource>` → table with name, active badge, actions. Search box filters client-side.
- Create: modal form → `POST /<resource>`. Edit: modal → `PATCH /<resource>/:id` (send only changed fields). Delete: confirm → `DELETE /<resource>/:id` (soft delete); on `409` show the server message ("already used — deactivate instead"). Inactive rows are shown greyed (admin lists include them only if the API returns them).
- Fields: class `{ name, description? }`; section `{ classId, name }`; category `{ name }`; subject `{ name, defaultCategories }`. Check the corresponding `*.validator.js` in the API repo for exact optional fields (`isActive` toggle for update).

### 7.5 Assignments (A, T)
| Route | Behaviour |
|-------|-----------|
| `/assignments` | `GET /subject-assignments?academicYear&semester&calendarMonth&status&allocationId&page&limit`. Filters: year (default current), semester, month, status. Teacher sees own + non-expired shared automatically. Cards show subject, class/sections, month, status, main teacher, "Shared to X until D". **New assignment** modal (A and T): allocation select (`GET /subject-allocations?limit=100`; for T only allocations where `mainTeacher._id` is own), semester (restricted to the allocation's `semesters`), calendar month, academic year → `POST /subject-assignments { allocationId, semester, calendarMonth, academicYear }` (**no category overrides at creation**; adjust on the detail page). 409 → show "already exists" |
| `/assignments/[id]` | `GET /subject-assignments/:id`. Shows header, `effectiveCategories` table (name, maxMarks, order), share status. **Edit categories** (A and main T, only if status `pending`): rows of editable `maxMarks`, remove button, "Add category" (select from `GET /categories`, not already present). Save → `PATCH { categoriesOverride, removedCategoryIds }` built as: `categoriesOverride = every category now shown → { categoryId, maxMarks, order }` (ids as strings), `removedCategoryIds = (previous removedCategoryIds ∪ categories removed in this session) minus any re-added` (map with `idOf`). A category must not appear in both lists. At least one category must remain. If marks already exist the server returns 409 — show it. **Status**: button "Mark completed" → `PATCH { status: 'completed' }` (completed assignments cannot be edited or shared). **Share** (A and main T, only when not completed): modal with teacher select + duration presets (Today → end of today, 2 days, Until I'm back → omit `sharedUntil`) → `POST /subject-assignments/:id/share { sharedToTeacherId, sharedUntil? }` (`sharedUntil` ISO string, must be future). **Unshare** → `POST /subject-assignments/:id/unshare`. **Delete** (A only) → `DELETE`; 409 if marks exist. A shared teacher sees no share/edit controls |

### 7.6 Marks entry — `/marks/[assignmentId]` (T; A read-only)
1. `GET /subject-assignments/:id` → `effectiveCategories`, `allocation.class`, `allocation.sections`, `status`.
2. Section tabs (one per `allocation.sections`). For the active section: `GET /students?classId=<class._id>&sectionId=<section._id>` and existing marks `GET /mark-sheets?assignmentId=<id>&limit=100` (follow `pagination.hasNextPage`); index by `student._id` then `categoryId`.
3. `MarksGrid`: rows = students (roll number, name via `personName(student)`), columns = categories with header `name (maxMarks)`. Inputs accept numbers `0…maxMarks` (client validation; red border outside range), decimals allowed, empty = not entered. Live row total / total max.
4. Save (per section): `POST /mark-sheets/bulk { assignmentId, sheets: [{ studentId, marks: [{ categoryId, obtainedMarks }] }] }` containing only students with ≥ 1 entered value, only entered categories, and **never `maxMarks`**. Success → toast "Marks saved", reload existing marks. Server 400/403/409 → show message.
5. Read-only when `status === 'completed'`, or role is `admin`, or the share has expired (403 on save).
6. Warn on navigation with unsaved changes.

### 7.7 Student attendance — `/attendance/[assignmentId]` (T), `/attendance/my` (S)
**Take (T):** assignment + section tabs as in §7.6, `date` picker (default today, cannot be a future date client-side). Load students `GET /students?classId&sectionId`; existing record `GET /student-attendance?classId&sectionId&date` (`attendance[0]` → prefill). All students default **Present**; tapping flips to **Absent** and reveals a reason input (≤ 200 chars; chips Sick / Family trip / custom). Header shows counts live. Save per section → `POST /student-attendance { assignmentId, date, records: [{ studentId, status: 'Present'|'Absent', reason }] }` with **all** students of the section (`reason` `''` when present). Status strings are exactly `Present` / `Absent`.
**My attendance (S):** `MonthPicker` → `GET /student-attendance/my?monthKey` → totals, `PercentBar`, calendar-style list of `records` with absent days highlighted and reasons.
**Admin/teacher lookups:** `/reports/class` links to per-student attendance via `GET /student-attendance/summary?studentId&monthKey`.

### 7.8 Progress & reports
| Route | Roles | Behaviour |
|-------|-------|-----------|
| `/progress` | S | `MonthPicker` (default current month) → `GET /progress-reports?studentId=<own student id>&monthKey` (own id: `auth.user.profileId`). Show overall total/max/%/grade, then a card per subject with its category marks; highlight weak subjects (< 40%). Plus attendance block from `GET /student-attendance/summary?studentId&monthKey` (absent days with reasons). 404 → "No marks entered for this month" EmptyState |
| `/reports/class` | A, T | Selects: class → section → `MonthPicker` → `GET /progress-reports/class?classId&sectionId&monthKey&page&limit` table (rank/name/%/grade). Row click opens the student's full report via `GET /progress-reports?studentId&monthKey` in a modal/page. T gets 403 for classes they have not entered marks in: show the message |
| `/teacher-attendance/my` | T | `MonthPicker` → `GET /teacher-attendance/my?monthKey` (view only) |

---

## 8. State and caching rules
- Pinia stores: `auth` (user only), `assignments` (lists + selected), `marks`, `attendance`. Keep them thin; fetch per screen, refetch on enter.
- `useLookups()` caches classes, sections, subjects, categories per session (invalidate after any master-data mutation).
- Refresh lists after every mutation. Shared assignments expire server-side, so never cache assignment lists across navigations longer than the page lifetime.

## 9. PWA rules
- `@vite-pwa/nuxt` as configured in §2.4; precache only the app shell. **Never cache API responses**; marks and attendance require a live connection.
- Show an offline banner (`navigator.onLine` + `online`/`offline` events) and disable Save buttons while offline.
- Installable: manifest + icons present (`npm run icons`); verify in Chrome DevTools → Application after `npm run build && npm run preview`.

---

## 10. Build order and acceptance checks

Run each check before moving on.

| # | Build | Check |
|---|-------|-------|
| 1 | §2–§3 bootstrap, CSS, layouts, `app.vue` | `npm run dev` serves; `/` redirects to `/login` |
| 2 | `useApi`, `auth` store, middleware, login, logout, nav | Log in as admin `9988776655`/`Admin@123` → dashboard; reload page keeps session (`/users/me`); logout returns to login; wrong password shows server message |
| 3 | Master data CRUD (classes, sections, categories, subjects) | Create "Class 4", add section "A", create category + subject with defaults; delete blocked message appears for used items |
| 4 | Admin users (create teacher + student) | Create student (class, section, roll number, guardian) and a second teacher; both appear in lists; log in as each in a private window |
| 5 | Allocations | Allocate Maths → Class 1 → [A] → teacher Ms. Aisha (8888888888), semesters 1,2 |
| 6 | Assignments list/detail/create/edit/share | Create June assignment; edit categories (remove one, change max); share to another teacher and see it under "Shared With Me" for that teacher; unshare |
| 7 | Marks entry | As Ms. Aisha enter marks for the student; reload shows saved values; out-of-range blocked; as the student on `/progress` the report appears |
| 8 | Student attendance (take + my) | Mark absent with reason; student sees it in `/attendance/my` |
| 9 | Teacher attendance (admin + teacher my) | Admin marks a teacher absent; teacher sees it under My attendance |
| 10 | Dashboards, class reports, profile, forgot/reset | Dashboards render for all roles; class report lists the student; password change logs out |
| 11 | PWA | `npm run build && npm run preview`: manifest valid, service worker registers, app installable, API calls not cached |
| 12 | Quality pass | No console errors; 360 px wide layout usable without horizontal scroll; every page has loading/error/empty states; `npm run build` exits 0 |

**Definition of done:** all rows above pass and `npm run build` succeeds.

---

## 11. Backend fixes already applied

These API issues were found while writing this spec and are **fixed** in the backend repo. If you run an older API build, the symptoms below tell you what is missing:

| Fix | What changed | Symptom on an old build |
|-----|--------------|-------------------------|
| Roll numbers | `rollNo` → `rollNumber` in mark-sheet, attendance and progress-report populates, the progress report (`student.rollNumber`) and the student dashboard (`student.rollNumber`) | Roll number blank in marks, attendance and reports |
| `profileId` | `/users/me`, login and create-user responses include `profileId` (Student/Teacher `_id`) | Student progress and attendance-summary pages cannot get `studentId` |
| Teacher list | `GET /teachers` allows `teacher` as well as `admin` (needed to pick a colleague when sharing). Returns each teacher's name, email and phone | 403 when a teacher opens the share dialog |
| Mark-sheet counts | Removed the invalid `isActive: true` filter on mark-sheet queries | Admin `totalMarkSheets` stuck at 0, student `latestMarkSheet` always null, categories used in marks deletable |

Remaining limit: `GET /students` returns a flat list without pagination; for large classes filter by class and section.

---

## 12. Do not
- Do not read or store JWTs; do not add `Authorization` headers (cookies only).
- Do not call endpoints not listed in §7; do not send fields outside the documented bodies.
- Do not use `subject.defaultCategories` outside the admin subject editor.
- Do not send `maxMarks` when saving marks.
- Do not enable SSR, and do not cache API responses in the service worker.
- Do not add a UI library or TypeScript.
