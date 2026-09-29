# Bhatkal Halls API

Backend REST API for **BhatkalHalls.com** — a platform to discover and book wedding halls, auditoriums, and banquet halls in Bhatkal and surrounding coastal Karnataka cities.

Built with Node.js, Express.js, and MongoDB.

## Features

- JWT authentication with short-lived access tokens and rotating refresh tokens (HttpOnly cookies)
- AES-encrypted password transport from client
- Role-based access control: `user`, `hall_owner`, `admin`, `super_admin`
- API key guard on all routes (`X-API-Key` header)
- Account lockout after configurable failed login attempts
- Forgot/reset password via email token and OTP
- Hall management: create, update, soft-delete, image gallery
- Cloudinary image upload and deletion (admin)
- Public hall listing with filtering and pagination
- Booking management: create `booked` or `blocked` entries, payment tracking (pending/partial/paid), auto-computed remaining amount
- Public availability calendar per hall (returns booked/blocked dates by month)
- Monthly dashboard summary: revenue, payment breakdown, occupancy stats
- Brevo transactional email integration
- Request logging via pino
- Rate limiting per route group (auth, forgot password, hall search, token refresh)
- Helmet security headers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Framework | Express.js 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Encryption | crypto-js (AES) |
| Validation | Joi |
| File upload | express-fileupload |
| Image storage | Cloudinary v2 |
| Email | Brevo (sib-api-v3-sdk) |
| Logging | pino + pino-http |
| Security | helmet, express-rate-limit, cookie-parser |

## API Reference

Base path: `/api/v1`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register user |
| POST | `/auth/login` | - | Login, sets JWT cookies |
| GET | `/auth/logout` | user | Clears JWT cookies |
| POST | `/auth/forgot-password` | - | Send reset email |
| POST | `/auth/password/reset/:token` | - | Reset password via token |
| PUT | `/auth/password/update` | user | Update own password |
| GET | `/auth/refresh-token` | - | Rotate access + refresh tokens |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | user | Get own profile |

### Halls (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/halls` | - | List active halls (filter, paginate) |
| GET | `/halls/:id` | - | Get single hall |

### Halls (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/halls` | hall_owner, super_admin | Create hall |
| GET | `/admin/halls` | hall_owner, super_admin | List all halls |
| GET | `/admin/halls/:id` | hall_owner, super_admin | Get hall by ID |
| PATCH | `/admin/halls/:id` | hall_owner, super_admin | Update hall |
| DELETE | `/admin/halls/:id` | hall_owner, super_admin | Delete hall |
| PATCH | `/admin/halls/:id/verify` | super_admin | Verify a hall |
| POST | `/admin/halls/:id/restore` | super_admin | Restore a soft-deleted hall |

### Upload (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/upload/images` | hall_owner, super_admin | Upload images to Cloudinary |
| DELETE | `/admin/upload/images` | hall_owner, super_admin | Delete image from Cloudinary |

### Bookings (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/bookings/availability/:hallId` | - | Booked/blocked dates for a hall (`?month=YYYY-MM`) |

### Bookings (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/bookings/availability/:hallId` | hall_owner, super_admin | Availability with full booking detail |
| GET | `/admin/bookings` | hall_owner, super_admin | List bookings (filter by `?hall=id`) |
| POST | `/admin/bookings` | hall_owner, super_admin | Create booking or blocked date |
| PATCH | `/admin/bookings/:id` | hall_owner, super_admin | Update booking |
| DELETE | `/admin/bookings/:id` | hall_owner, super_admin | Delete booking |

### Dashboard (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | hall_owner, super_admin | Monthly summary — bookings, revenue, payment breakdown, occupancy (`?hall=id&month=YYYY-MM`) |

### Health

```
GET /health
```

Returns server status, uptime, and request ID.

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB instance
- Cloudinary account
- Brevo account (for email)

### Installation

```bash
git clone <repo-url>
cd halls-api
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development
APP_NAME=BhatkalHallsAPI

MONGO_URI=mongodb://localhost:27017/bhatkal-halls

JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=7d

FRONTEND_URL=http://localhost:3000
LOCALHOST=http://localhost:3000
COOKIE_EXPIRES=7

CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_NAME=bhatkal-halls

ENCRYPTION_SECRET=your_aes_secret
API_KEY=your_api_key

PASSWORD_EXPIRE=10
OTP_EXPIRE=10
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# Brevo (email)
BREVO_API_KEY=your_brevo_key
SENDER_EMAIL=noreply@bhatkalhalls.com
SENDER_NAME=Bhatkal Halls
```

### Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm start

# Lint
npm run lint

# Generate AES-encrypted test password
node src/tests/helpers/generatePassword.js
```

## Project Structure

```
src/
├── app.js                    # Express app, middleware stack, routes
├── server.js                 # HTTP server, DB connect, process signals
├── config/db.js              # Mongoose connection
├── middlewares/              # Auth, validation, rate limit, error, logging, API key
├── modules/
│   ├── auth/                 # Auth controllers, routes, validators
│   ├── bookings/
│   │   ├── admin/            # Booking CRUD (hall_owner / super_admin)
│   │   ├── public/           # Availability calendar
│   │   ├── booking.model.js
│   │   └── booking.validator.js
│   ├── dashboard/            # Monthly summary (hall_owner / super_admin)
│   ├── halls/
│   │   ├── admin/            # Admin hall CRUD
│   │   ├── public/           # Public hall read
│   │   ├── hall.model.js
│   │   └── hall.validator.js
│   ├── upload/               # Cloudinary upload/delete
│   └── users/                # User profile
└── utils/                    # ApiError, cloudinary, encryption, email, logger, tokens
```

## Cities Supported

Bhatkal, Murdeshwar, Honavar, Kumta

## Hall Amenities

AC, Parking, Kitchen, Dining Hall, Bride Room, Sound System, Decoration, Generator, CCTV, Lift

## License

UNLICENSED — private project.
