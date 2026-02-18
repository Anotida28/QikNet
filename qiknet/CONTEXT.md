# QikNet WiFi Voucher Sales System - Project Context

## Overview

QikNet is a WiFi hotspot voucher sales system for **Zimbabwe**, accepting **EcoCash** payments via **Paynow**. Users purchase time-based WiFi vouchers through a web interface, receive instant voucher codes after payment, and use them to access the hotspot.

**Owner:** Alistair Patsanza / Qiknet Digital Solutions  
**Domain:** qiknet.co.zw (registered Jan 2026, Cloudflare DNS)  
**Location:** 11a Cambridge Road, Avondale, Harare, Zimbabwe

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Static HTML + CSS + Vanilla JS |
| Backend | Node.js + TypeScript + Express |
| Database | MySQL + Prisma ORM |
| Payments | Paynow Zimbabwe (EcoCash STK Push) |

---

## Project Structure

```
qiknet/
├── .gitignore
├── README.md
├── CONTEXT.md                    # This file
├── docs/
│   ├── domain-info.txt           # ZISPA domain registration details
│   └── vouchers-sample.csv       # Sample voucher format
├── frontend/
│   ├── README.md
│   ├── assets/                   # Images, icons
│   └── public/
│       └── index.html            # Main purchase page
└── backend/
    ├── .env.example              # Environment template
    ├── Dockerfile
    ├── README.md
    ├── package.json
    ├── tsconfig.json
    ├── reference/
    │   └── paynow-python-sample.txt  # Original Python code (reference)
    ├── prisma/
    │   ├── schema.prisma         # Database models
    │   └── migrations/
    └── src/
        ├── server.ts             # Express app + middleware
        ├── routes.ts             # Route registration
        ├── env.ts                # Environment validation (Zod)
        ├── db.ts                 # Prisma client singleton
        ├── plans.ts              # Pricing + durations (server-side)
        ├── voucherLogic.ts       # Voucher code generation + expiry
        ├── common/
        │   ├── errors.ts         # Custom error classes
        │   ├── validate.ts       # Zod validation helpers
        │   └── logger.ts         # Logging utility
        ├── paynow/
        │   ├── paynowClient.ts   # Paynow API integration
        │   └── paynowTypes.ts    # TypeScript types
        └── modules/
            ├── payments/
            │   ├── payments.routes.ts
            │   ├── payments.service.ts
            │   └── payments.repo.ts
            ├── vouchers/
            │   ├── vouchers.routes.ts
            │   ├── vouchers.service.ts
            │   └── vouchers.repo.ts
            └── admin/
                ├── admin.routes.ts
                └── admin.service.ts
```

---

## Database Models (Prisma)

### Payment
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID primary key |
| reference | String | Unique payment reference (QIK-xxx) |
| phone | String | EcoCash phone number |
| plan | String | Plan ID (1hr, 1day, 48hr, 7day) |
| currency | String | USD or ZIG |
| amount | Decimal | Payment amount |
| status | Enum | PENDING, PAID, FAILED, EXPIRED, CANCELLED |
| pollUrl | String? | Paynow poll URL |
| providerRef | String? | Paynow transaction reference |
| createdAt | DateTime | Created timestamp |
| updatedAt | DateTime | Updated timestamp |

### Voucher
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID primary key |
| code | String | Unique voucher code (QKHR-xxxxxxxx) |
| plan | String | Plan ID |
| issuedAt | DateTime | When voucher was created |
| expiresAt | DateTime | When voucher expires |
| status | Enum | ACTIVE, USED, EXPIRED, REVOKED |
| paymentId | String | FK to Payment (unique, 1:1) |

### Session (for captive portal)
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID primary key |
| macAddress | String | Device MAC address |
| startedAt | DateTime | Session start |
| endsAt | DateTime | Session end |
| status | Enum | ACTIVE, ENDED, EXPIRED |
| voucherId | String | FK to Voucher |

---

## API Endpoints

### Public Endpoints

#### POST /pay
Initiate EcoCash payment.

**Request:**
```json
{
  "phone": "0785076944",
  "plan": "1hr",
  "currency": "USD",
  "method": "ecocash"
}
```

**Response:**
```json
{
  "success": true,
  "reference": "QIK-M2K8X1-A3B4C5",
  "message": "Prompt sent"
}
```

**Notes:**
- Amount is looked up server-side from `plans.ts` (never trusted from frontend)
- Phone is normalized to +263 format
- Triggers Paynow EcoCash STK push

#### GET /payments/:reference
Check payment status and get voucher.

**Response (pending):**
```json
{
  "success": true,
  "status": "PENDING"
}
```

**Response (paid):**
```json
{
  "success": true,
  "status": "PAID",
  "voucher": "QKHR-A1B2C3D4",
  "expiry": "2026-02-18 15:30"
}
```

**Notes:**
- Polls Paynow if status is PENDING
- Issues voucher on first PAID confirmation (idempotent)

#### POST /vouchers/validate
Validate voucher (for captive portal).

**Request:**
```json
{
  "code": "QKHR-A1B2C3D4",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

**Response (valid):**
```json
{
  "valid": true,
  "expiresAt": "2026-02-18T15:30:00.000Z",
  "plan": "1hr"
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "reason": "EXPIRED"  // or NOT_FOUND, REVOKED
}
```

### Admin Endpoints (require X-Admin-Key header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/stats | System statistics |
| GET | /admin/payments | List payments |
| GET | /admin/vouchers | List vouchers |
| POST | /admin/vouchers/:code/revoke | Revoke a voucher |
| POST | /admin/maintenance | Run cleanup tasks |

---

## WiFi Plans & Pricing

| Plan ID | Name | Duration | USD | ZIG |
|---------|------|----------|-----|-----|
| 1hr | 1 Hour | 60 min | $0.20 | 0.20 |
| 1day | 1 Day | 24 hr | $0.50 | 0.50 |
| 48hr | Bi-Daily | 48 hr | $1.00 | 1.00 |
| 7day | Weekly | 7 days | $3.00 | 3.00 |

Prices are configured in `backend/src/plans.ts`.

---

## Paynow Integration

### Credentials (from .env)
- **ZWL/ZIG Account:** Integration ID 23112
- **USD Account:** Integration ID 23113

### Flow
1. Frontend calls `POST /pay` with phone + plan
2. Backend looks up price, generates reference
3. Backend calls Paynow API with SHA512-hashed request
4. Paynow sends EcoCash STK push to user's phone
5. User enters PIN to confirm payment
6. Frontend polls `GET /payments/:reference` every 3 seconds
7. Backend polls Paynow's `pollUrl` to check status
8. On PAID: Backend generates voucher, returns to frontend
9. Frontend displays voucher code + expiry

### Hash Generation
Paynow requires SHA512 hash of all field values (in order) + integration key:
```typescript
hashString = id + reference + amount + additionalinfo + returnurl + resulturl + authemail + phone + method + status + integrationKey
hash = SHA512(hashString).toUpperCase()
```

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="mysql://root:password@localhost:3306/qiknet"

# Paynow ZWL/ZIG
PAYNOW_INTEGRATION_ID=23112
PAYNOW_INTEGRATION_KEY=206e3fe2-0121-457c-8904-e2f80aa99faa

# Paynow USD
PAYNOW_INTEGRATION_ID_USD=23113
PAYNOW_INTEGRATION_KEY_USD=50c239c8-4628-4d47-a069-7b32810c1661

# Callback URLs (must be publicly accessible)
PAYNOW_RESULT_URL=https://yourdomain.com/paynow/callback
PAYNOW_RETURN_URL=https://yourdomain.com/payment/complete

# Email for Paynow receipts
PAYNOW_DEFAULT_EMAIL=payments@qiknet.co.zw

# Admin authentication
ADMIN_API_KEY=your-secure-admin-key-here

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or pnpm

### Development Setup

```powershell
# Navigate to backend
cd qiknet\backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Server runs at http://localhost:3000

### Production Build

```powershell
npm run build
npm start
```

### Windows Server Deployment

1. Install Node.js 18 LTS
2. Install MySQL 8.0
3. Clone/copy project
4. Configure `.env`
5. Run migrations
6. Use PM2 for process management:
```powershell
npm install -g pm2
pm2 start dist/server.js --name qiknet
pm2 save
pm2 startup
```

---

## Security Features

- **Rate limiting:** 10 requests per minute on `/pay` and `/vouchers/validate`
- **Admin auth:** X-Admin-Key header required for admin routes
- **Server-side pricing:** Amount never trusted from frontend
- **Input validation:** Zod schemas for all inputs
- **Graceful shutdown:** Database connections properly closed

---

## Frontend Behavior

1. User selects plan and enters EcoCash number
2. Clicks "Pay with EcoCash"
3. Frontend calls `POST /pay`
4. Shows "Prompt sent" message
5. Starts polling `GET /payments/:reference` every 3 seconds
6. On PAID: Displays voucher code and expiry
7. User screenshots the voucher
8. Polling stops after 3 minutes (timeout)

---

## Files Migrated from Original Project

| Original | New Location |
|----------|--------------|
| index.html | frontend/public/index.html |
| Python Paynow Code.txt | backend/reference/paynow-python-sample.txt |
| QikNet Domain Info.txt | docs/domain-info.txt |
| vouchers.csv | docs/vouchers-sample.csv |

---

## TODO / Future Work

- [ ] Implement Paynow result callback endpoint (POST /paynow/callback)
- [ ] Add WhatsApp bot integration (using Twilio)
- [ ] Implement Session model for MAC address tracking
- [ ] Add captive portal integration guide
- [ ] Configure DNS A records for qiknet.co.zw
- [ ] Set up HTTPS with Let's Encrypt
- [ ] Add email receipts
- [ ] Implement voucher expiry cron job

---

## Support Contacts

- +263 780 250 548
- +263 778 992 491
- +263 785 076 944

---

*Last updated: February 18, 2026*
