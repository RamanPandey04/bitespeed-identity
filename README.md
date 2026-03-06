# Bitespeed Identity Reconciliation

A backend service that identifies and links customer contacts across multiple purchases — useful when the same person checks out with different emails or phone numbers over time.

## Live Endpoint

**Base URL:** `https://bitespeed-identity-w88y.onrender.com`

- `POST /identify` → `https://bitespeed-identity-w88y.onrender.com/identify`

## API Reference

### `POST /identify`

Provide at least one of `email` or `phoneNumber`:

**Request:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "9999999999"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["9999999999"],
    "secondaryContactIds": [2, 3]
  }
}
```

| Field | Description |
|---|---|
| `primaryContatctId` | ID of the primary identity |
| `emails` | All known emails (primary first) |
| `phoneNumbers` | All known phone numbers (primary first) |
| `secondaryContactIds` | IDs of all linked secondary contacts |

## How Identity Resolution Works

**New shopper** — neither email nor phone matches anything → new primary contact created.

**Partial match** — email or phone matches an existing contact, but request has new info → new secondary contact created and linked to the primary.

**Two clusters linked** — email matches one primary, phone matches another → older primary stays primary, newer one is downgraded to secondary.

## Data Model

```
Contact
- id              Int       (PK, auto-increment)
- phoneNumber     String?   (nullable)
- email           String?   (nullable)
- linkedId        Int?      (points to primary contact)
- linkPrecedence  String    ("primary" | "secondary")
- createdAt       DateTime
- updatedAt       DateTime
- deletedAt       DateTime? (soft delete)
```

## Local Setup

```bash
git clone https://github.com/RamanPandey04/bitespeed-identity.git
cd bitespeed-identity
npm install
cp .env.example .env
# add your DATABASE_URL in .env
npm run dev
```

Server runs on `http://localhost:3000`

## Project Structure

```
.
├── src/
│   ├── index.ts             # entry point
│   ├── app.ts               # express setup + routes
│   ├── db.ts                # db connection + table init
│   ├── identityService.ts   # identity reconciliation logic
│   └── types.ts             # typescript interfaces
├── package.json
├── tsconfig.json
└── .env.example
```

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (via `pg`)
- Hosted on Render
