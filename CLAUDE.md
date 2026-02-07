# En Passant Backend

> Identity verification infrastructure for the internet.
> **Launch:** February 8, 2026 (Super Bowl LX)

## Quick Start

```bash
cd /home/placebo/enpassant-backend
npm install
npm run dev
```

## Tech Stack

- Node.js 20+ / Express 4.21
- PostgreSQL 15+ (Neon)
- JWT + Ed25519 cryptographic signing
- Argon2 password hashing
- AWS S3 + Google Cloud Vision

## Project Structure

```
src/
├── config/     # Environment, CORS, OAuth
├── db/         # Pool, migrations (6 total)
├── middleware/ # Auth, validation, errors
├── routes/     # HTTP endpoints
├── services/   # Business logic
└── utils/      # Helpers
```

## Key Commands

```bash
npm run dev              # Watch mode
npm run migrate          # Apply migrations
npm run seed:superbowl   # Price ceiling data
npm test                 # Run tests
```

## EP Score System (100 points)

| Anchor | Points |
|--------|--------|
| Base | 20 |
| Gmail | 25 |
| LinkedIn | 30 |
| .edu | 25 |

## API Routes

- `/api/auth` - Register, login, OAuth
- `/api/badges` - Generate, verify, revoke
- `/api/identity` - Connect/disconnect anchors
- `/api/listings` - Ticket marketplace
- `/api/invites` - Beta access codes

## Related Projects

- Frontend: `/home/placebo/enpassant-frontend/`
- Extension: `/home/placebo/enpassant-extension/`

## Deployment

- **API:** Railway (api.enpassantapi.io)
- **Frontend:** Vercel (enpassantapi.io)
- **Database:** Neon PostgreSQL
