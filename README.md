# TrustBridge Backend

Identity verification system for AI agents. Generates cryptographically signed Auth-Badges that prove user legitimacy, helping platforms distinguish good AI agents from bad bots.

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended for serverless)

### 2. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Ed25519 keypair
npm run generate-keys
# Copy the output keys to your .env file

# Edit .env with your database URL and keys
```

### 3. Database Setup

Create a Neon database at https://console.neon.tech and add the connection string to `.env`.

```bash
# Run migrations
npm run migrate
```

### 4. Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Identity Anchors

#### Connect Identity (Mock - Development)
```bash
POST /api/identity/mock/gmail
Authorization: Bearer <token>

# Optional overrides:
{
  "accountCreatedAt": "2020-01-01T00:00:00Z",
  "email": "custom@gmail.com"
}
```

```bash
POST /api/identity/mock/linkedin
Authorization: Bearer <token>

{
  "connectionCount": 500,
  "accountCreatedAt": "2019-01-01T00:00:00Z"
}
```

#### Connect Identity (Manual Data)
```bash
POST /api/identity/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "gmail",
  "data": {
    "providerId": "google-user-id",
    "email": "user@gmail.com",
    "accountCreatedAt": "2020-01-01T00:00:00Z"
  }
}
```

#### List Connected Anchors
```bash
GET /api/identity/anchors
Authorization: Bearer <token>
```

### Trust Score

#### Get Current Score
```bash
GET /api/user/score
Authorization: Bearer <token>
```

Response:
```json
{
  "trust_score": 75,
  "breakdown": {
    "identityAge": { "score": 30, "max": 40, "details": "Average account age: 3.5 years (good)" },
    "activityAuthenticity": { "score": 30, "max": 30, "details": "Gmail connected (+15), LinkedIn connected (+15)" },
    "networkDepth": { "score": 10, "max": 20, "details": "250 LinkedIn connections (good)" },
    "platformStanding": { "score": 5, "max": 10, "details": "Email verified (+5)" }
  }
}
```

### Auth-Badges

#### Generate Badge
```bash
POST /api/badges/generate
Authorization: Bearer <token>
```

Response:
```json
{
  "badge": {
    "badge_token": "abc123...",
    "payload": {
      "sub": "user-uuid",
      "iss": "trustbridge",
      "iat": 1704067200,
      "exp": 1704672000,
      "trust_score": 75,
      "badge_token": "abc123..."
    },
    "signature": "base64-signature...",
    "public_key_id": "key-id-hex",
    "expires_at": "2024-01-14T00:00:00.000Z"
  }
}
```

#### Verify Badge (Public)
```bash
POST /api/badges/verify
Content-Type: application/json

{
  "badge_token": "abc123...",
  "payload": { ... },
  "signature": "base64-signature..."
}
```

#### Get Public Key (Public)
```bash
GET /api/badges/public-key
```

#### Revoke Badge
```bash
POST /api/badges/revoke
Authorization: Bearer <token>
Content-Type: application/json

{
  "badge_token": "abc123...",
  "reason": "User requested revocation"
}
```

## Trust Score Algorithm

| Component | Max Points | Description |
|-----------|------------|-------------|
| Identity Age | 40 | Average age of connected accounts |
| Activity Authenticity | 30 | Human-like activity patterns |
| Network Depth | 20 | LinkedIn connection count |
| Platform Standing | 10 | Email verified, no fraud flags |

### Scoring Thresholds

**Identity Age:**
- 5+ years: 100% (40 pts)
- 2+ years: 75% (30 pts)
- 1+ year: 50% (20 pts)
- 3+ months: 25% (10 pts)

**LinkedIn Connections:**
- 500+: 100% (20 pts)
- 200+: 75% (15 pts)
- 50+: 50% (10 pts)
- 10+: 25% (5 pts)

## Project Structure

```
trustbridge-backend/
├── src/
│   ├── config/          # Environment and database config
│   ├── db/              # Database migrations and queries
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API endpoint handlers
│   ├── services/        # Business logic
│   └── app.js           # Express setup
├── scripts/             # Utility scripts
├── tests/               # Test files
├── server.js            # Entry point
└── package.json
```

## Development

```bash
# Run tests
npm test

# Run with auto-reload
npm run dev

# Generate new keys
npm run generate-keys
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes |
| `ED25519_PRIVATE_KEY` | Base64-encoded private key | Yes |
| `ED25519_PUBLIC_KEY` | Base64-encoded public key | Yes |
| `BADGE_EXPIRY_DAYS` | Badge validity period (default: 7) | No |
