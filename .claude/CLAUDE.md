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
│   ├── authMiddleware.js           # JWT verification, role guard (isAuthenticatedUser, authorizedRole)
│   ├── asyncHandlerMiddleware.js   # Wraps async route handlers, forwards errors
│   ├── decryptPasswordMiddleware.js # AES decrypt password from client before validation
│   ├── errorMiddleware.js          # Global error handler
│   ├── httpLoggerMiddleware.js     # pino-http request logger
│   ├── rateLimiterMiddleware.js    # express-rate-limit configs per route group
│   ├── requestIdMiddleware.js      # Attaches UUID to req.id
│   └── validateMiddleware.js       # Joi schema validation (body/query/params)
├── modules/
│   ├── auth/               # Register, Login, Logout, Forgot/Reset Password, Refresh Token
│   ├── halls/
│   │   ├── admin/          # Admin CRUD for halls (auth-gated, role: admin)
│   │   ├── public/         # Public read-only hall listing and detail
│   │   ├── hallModel.js    # Mongoose Hall schema
│   │   ├── hallValidator.js
│   │   └── hallConstants.js
│   ├── upload/             # Cloudinary image upload/delete (admin only)
│   └── users/              # Get current user profile, update password
└── utils/
    ├── apiError.js         # Custom error class (message, statusCode)
    ├── cloudinary.js       # Upload/delete helpers wrapping cloudinary v2
    ├── cookieOptions.js    # Shared cookie config for JWT cookies
    ├── encryption.js       # CryptoJS AES encrypt/decrypt
    ├── logger.js           # pino logger instance
    ├── sendEmail.js        # Brevo (sib-api-v3-sdk) transactional email
    └── sendToken.js        # Sets access + refresh JWT cookies on response
```

## API Routes

All routes are prefixed `/api/v1`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login |
| GET | `/auth/logout` | user | Logout |
| POST | `/auth/forgot-password` | - | Send reset email |
| PUT | `/auth/password/update` | user | Change own password |
| POST | `/auth/password/reset/:token` | - | Reset via token |
| GET | `/auth/refresh-token` | - | Rotate JWT pair |
| GET | `/users/me` | user | Get own profile |
| GET | `/halls` | - | List halls (public, paginated, filterable) |
| GET | `/halls/:id` | - | Get single hall (public) |
| POST | `/admin/halls` | admin | Create hall |
| GET | `/admin/halls` | admin | List all halls (includes inactive) |
| GET | `/admin/halls/:id` | admin | Get hall by ID |
| PATCH | `/admin/halls/:id` | admin | Update hall |
| DELETE | `/admin/halls/:id` | admin | Delete hall |
| POST | `/admin/upload/images` | admin | Upload images to Cloudinary |
| DELETE | `/admin/upload/images` | admin | Delete image from Cloudinary |

## Data Models

**User** — roles: `user`, `hall_owner`, `admin`. Auth source types: `normal`, `google`, `phone`. Stores hashed password (bcrypt, 12 rounds), login attempt locking, reset password token (sha256), and OTP.

**Hall** — location restricted to cities: `Bhatkal`, `Murdeshwar`, `Honavar`, `Kumta`. Amenity enum enforced at schema level. Images stored as Cloudinary URLs (1–10 images). Unique index on `(name, location.city)`. Soft-delete via `isActive` flag.

## Key Conventions

- **Error handling**: throw `new ApiError(message, statusCode)` inside route handlers; `asyncHandlerMiddleware` forwards to global error handler.
- **Validation**: Joi schemas live in `*Validator.js` beside the route file. Validate with `validate(schema, target)` where target is `'body'` (default), `'query'`, or `'params'`.
- **Auth guard**: apply `isAuthenticatedUser` then `authorizedRole('admin')` — or use `router.use(...)` at the top of admin routers (DRY pattern already established).
- **Password flow**: client sends AES-encrypted password; `decryptPasswordMiddleware` decrypts before Joi validation runs.
- **Tokens**: short-lived access token (default 15m) + long-lived refresh token (default 7d) set as HttpOnly cookies via `sendToken`.
- **Logging**: use the pino `logger` instance from `utils/logger.js` — never `console.log` in production paths.
- **File uploads**: `express-fileupload` with `useTempFiles: true`; files land in `/tmp/` before Cloudinary upload. 5MB limit enforced.

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
