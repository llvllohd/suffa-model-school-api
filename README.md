# Bhatkal Halls API

Backend REST API for **BhatkalHalls.com** — a platform to discover and book wedding halls, auditoriums, and banquet halls in Bhatkal and surrounding coastal Karnataka cities.

Built with Node.js, Express.js, and MongoDB.

## Features

- JWT authentication with short-lived access tokens and rotating refresh tokens (HttpOnly cookies)
- AES-encrypted password transport from client
- Role-based access control: `user`, `hall_owner`, `admin`
- Account lockout after configurable failed login attempts
- Forgot/reset password via email token and OTP
- Hall management: create, update, soft-delete, image gallery
- Cloudinary image upload and deletion (admin)
- Public hall listing with filtering and pagination
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
| POST | `/admin/halls` | admin | Create hall |
| GET | `/admin/halls` | admin | List all halls |
| GET | `/admin/halls/:id` | admin | Get hall by ID |
| PATCH | `/admin/halls/:id` | admin | Update hall |
| DELETE | `/admin/halls/:id` | admin | Delete hall |

### Upload (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/upload/images` | admin | Upload images to Cloudinary |
| DELETE | `/admin/upload/images` | admin | Delete image from Cloudinary |

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
├── middlewares/              # Auth, validation, rate limit, error, logging
├── modules/
│   ├── auth/                 # Auth controllers, routes, validators
│   ├── halls/
│   │   ├── admin/            # Admin hall CRUD
│   │   ├── public/           # Public hall read
│   │   ├── hallModel.js
│   │   └── hallValidator.js
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
