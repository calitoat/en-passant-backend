# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrustBridge is an identity verification system for AI agents that solves the "bot tax" problem. It generates cryptographically signed Auth-Badges that AI agents carry to prove their operators' legitimacy.

**Core concept:** Users connect identity anchors (Gmail, LinkedIn), the system calculates a Trust Score (0-100), and generates Ed25519-signed badges that platforms can verify.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Run development server (auto-reload)
npm run dev

# Run production server
npm start

# Run database migrations
npm run migrate

# Generate Ed25519 keypair for signing
npm run generate-keys

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

## Architecture

### Request Flow
```
Client → Express Routes → Services → Database (PostgreSQL)
                            ↓
                    Crypto Service (Ed25519 signing)
```

### Key Services

- **crypto.service.js** - Ed25519 signing/verification using @noble/ed25519. All badge signatures flow through here.
- **trustScore.service.js** - Calculates 0-100 trust scores. Scoring weights defined as constants at top of file.
- **badge.service.js** - Badge lifecycle: generate, verify, revoke. Calls crypto and trustScore services.
- **identity.service.js** - Manages connected identity providers. Currently supports mock data; OAuth in Phase 2.

### Database Schema

Four main tables:
- `users` - Accounts with argon2-hashed passwords
- `identity_anchors` - Connected providers (gmail, linkedin) with metadata
- `auth_badges` - Signed badges with expiry and revocation status
- `badge_verifications` - Audit log of verification requests

### Trust Score Components

| Component | Points | Source |
|-----------|--------|--------|
| Identity Age | 40 | Average age of connected accounts |
| Activity Authenticity | 30 | Provider presence (mock), OAuth patterns (Phase 2) |
| Network Depth | 20 | LinkedIn connection count |
| Platform Standing | 10 | Email verified, no fraud flags |

Thresholds defined in `src/services/trustScore.service.js`.

## Important Patterns

- **ES Modules** - Project uses `"type": "module"` in package.json
- **Thin routes, fat services** - Routes handle HTTP; business logic lives in services
- **Config validation** - `src/config/index.js` throws on missing required env vars
- **Canonical JSON** - Badge payloads serialized with sorted keys before signing
