# halls-api — CLAUDE.md

## Project Overview

REST API backend for **BhatkalHalls.com** — a platform to discover and book wedding halls, auditoriums, and banquet halls in Bhatkal (and nearby cities: Murdeshwar, Honavar, Kumta).

Stack: Node.js + Express.js + MongoDB (Mongoose). No TypeScript. CommonJS modules throughout.

## Project Structure

```
src/
├── app.js                  # Express app setup, middleware order, route mounting
├── server.js               # HTTP server, DB connection, process signal handlers
├── config/
│   └── db.js               # Mongoose connection
├── middlewares/
│   ├── apiKey.middleware.js          # X-API-Key header guard (skips /health)
│   ├── auth.middleware.js            # JWT verification, role guard (isAuthenticatedUser, authorizedRole)
│   ├── asyncHandler.middleware.js    # Wraps async route handlers, forwards errors
│   ├── decryptPassword.middleware.js # AES decrypt password from client before validation
│   ├── error.middleware.js           # Global error handler
│   ├── httpLogger.middleware.js      # pino-http request logger
│   ├── rateLimiter.middleware.js     # express-rate-limit configs per route group
│   ├── requestId.middleware.js       # Attaches UUID to req.id
│   └── validate.middleware.js        # Joi schema validation (body/query/params)
├── modules/
│   ├── auth/               # Register, Login, Logout, Forgot/Reset Password, Refresh Token
│   ├── bookings/
│   │   ├── admin/          # Hall owner / super_admin booking CRUD + availability
│   │   ├── public/         # Public availability query
│   │   ├── booking.model.js
│   │   └── booking.validator.js
│   ├── dashboard/          # Monthly summary for hall_owner / super_admin
│   ├── halls/
│   │   ├── admin/          # Admin CRUD for halls (auth-gated, role: admin)
│   │   ├── public/         # Public read-only hall listing and detail
│   │   ├── hall.model.js
│   │   ├── hall.validator.js
│   │   └── hall.constants.js
│   ├── upload/             # Cloudinary image upload/delete (admin only)
│   └── users/              # Get current user profile, update password
└── utils/
    ├── apiError.js         # Custom error class (message, statusCode)
    ├── checkMagicBytes.js  # Validates file magic bytes (JPEG/PNG/WebP/GIF)
    ├── cloudinary.js       # Upload/delete helpers wrapping cloudinary v2
    ├── cookieOptions.js    # Shared cookie config for JWT cookies
    ├── encryption.js       # CryptoJS AES encrypt/decrypt
    ├── logger.js           # pino logger instance
    ├── paginate.js         # Reusable pagination helper for Mongoose queries
    ├── sendEmail.js        # Brevo (sib-api-v3-sdk) transactional email
    └── sendToken.js        # Sets access + refresh JWT cookies on response
```

## API Routes

All routes are prefixed `/api/v1`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login |
| POST | `/auth/logout` | user | Logout |
| POST | `/auth/forgot-password` | - | Send reset email |
| PUT | `/auth/password/update` | user | Change own password |
| POST | `/auth/password/reset/:token` | - | Reset via token |
| POST | `/auth/refresh-token` | - | Rotate JWT pair |
| GET | `/users/me` | user | Get own profile |
| GET | `/halls` | - | List halls (public, paginated, filterable) |
| GET | `/halls/:id` | - | Get single hall (public) |
| GET | `/bookings/availability/:hallId` | - | Get booked/blocked dates for a hall (month query) |
| POST | `/admin/halls` | hall_owner, super_admin | Create hall |
| GET | `/admin/halls` | hall_owner, super_admin | List all halls (includes inactive) |
| GET | `/admin/halls/:id` | hall_owner, super_admin | Get hall by ID |
| PATCH | `/admin/halls/:id` | hall_owner, super_admin | Update hall |
| DELETE | `/admin/halls/:id` | hall_owner, super_admin | Delete hall |
| PATCH | `/admin/halls/:id/verify` | super_admin | Verify a hall |
| POST | `/admin/halls/:id/restore` | super_admin | Restore a soft-deleted hall |
| POST | `/admin/upload/images` | hall_owner, super_admin | Upload images to Cloudinary |
| DELETE | `/admin/upload/images` | hall_owner, super_admin | Delete image from Cloudinary |
| GET | `/admin/bookings/availability/:hallId` | hall_owner, super_admin | Availability with full booking detail |
| GET | `/admin/bookings` | hall_owner, super_admin | List bookings (filter by hall) |
| POST | `/admin/bookings` | hall_owner, super_admin | Create booking or blocked date |
| PATCH | `/admin/bookings/:id` | hall_owner, super_admin | Update booking |
| DELETE | `/admin/bookings/:id` | hall_owner, super_admin | Delete booking |
| GET | `/admin/dashboard` | hall_owner, super_admin | Monthly summary (bookings, revenue, availability) |

## Data Models

**User** — roles: `user`, `hall_owner`, `super_admin`. Auth source types: `normal`, `google`, `phone`. Stores hashed password (bcrypt, 12 rounds), login attempt locking, reset password token (sha256), OTP, and `refreshTokenVersion` for token invalidation on logout/password change.

**Hall** — location restricted to cities: `Bhatkal`, `Murdeshwar`, `Honavar`, `Kumta`. Amenity enum enforced at schema level. Images stored as Cloudinary URLs (1–10 images). Unique partial index on `(name, location.city)` where `isDeleted: false`. Soft-delete via `isDeleted` flag (also sets `isActive: false`).

**Booking** — types: `booked` (customer booking with payment tracking) or `blocked` (date block, no customer fields). Fields for `booked`: `customerName`, `customerPhone`, `totalAmount`, `paidAmount`, `remainingAmount` (auto-computed), `paymentStatus` (auto-computed: `pending`/`partial`/`paid`). `endDate` defaults to `startDate` if omitted. Dates normalized to UTC midnight. Indexed on `(hall, startDate, endDate)` and `(owner, startDate)`.

## Key Conventions

- **Error handling**: throw `new ApiError(message, statusCode)` inside route handlers; `asyncHandler.middleware` forwards to global error handler.
- **Validation**: Joi schemas live in `*Validator.js` beside the route file. Validate with `validate(schema, target)` where target is `'body'` (default), `'query'`, or `'params'`.
- **Auth guard**: apply `isAuthenticatedUser` then `authorizedRole('hall_owner', 'super_admin')` — or use `router.use(...)` at the top of admin routers (DRY pattern already established).
- **Password flow**: passwords are sent as plaintext over HTTPS. `decryptPassword.middleware` exists but is not wired to any route.
- **Tokens**: short-lived access token (default 15m) + long-lived refresh token (default 7d) set as HttpOnly cookies via `sendToken`.
- **Logging**: use the pino `logger` instance from `utils/logger.js` — never `console.log` in production paths.
- **File uploads**: `express-fileupload` with `useTempFiles: true`; files land in `/tmp/` before Cloudinary upload. 5MB limit enforced. MIME type and magic bytes (JPEG/PNG/WebP/GIF) validated before upload; temp files are always cleaned up.
- **Booking overlap**: `createBooking` and `updateBooking` use MongoDB transactions (`session.withTransaction`) to atomically check for overlapping bookings and write, preventing race conditions.

## Environment Variables Required

```
PORT
NODE_ENV
APP_NAME
MONGO_URI
JWT_SECRET
JWT_EXPIRATION          # e.g. 15m
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRATION  # e.g. 7d
FRONTEND_URL
LOCALHOST
COOKIE_EXPIRES
CLOUDINARY_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER_NAME
ENCRYPTION_SECRET       # AES key for password encryption
API_KEY                 # X-API-Key header value required on all non-health routes
PASSWORD_EXPIRE         # minutes, default 10
OTP_EXPIRE              # minutes, default 10
LOGIN_MAX_ATTEMPTS      # default 5
LOGIN_LOCK_MINUTES      # default 15
EMAIL_*                 # Brevo (sib-api-v3-sdk) config
```

## Development

```bash
npm install
npm run dev         # nodemon, watches .js and .hbs
npm start           # production
npm run lint        # eslint src
node src/tests/helpers/generatePassword.js   # generate AES-encrypted test password
```

Node >= 18 required.
