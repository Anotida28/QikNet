# QikNet Backend

Node.js + TypeScript + Express backend for QikNet WiFi voucher sales.

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or pnpm

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Setup database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Run development server

```bash
npm run dev
```

Server runs on http://localhost:3000

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### POST /pay
Initiate EcoCash payment.

Request:
```json
{
  "phone": "0785076944",
  "plan": "1hr",
  "currency": "USD",
  "method": "ecocash"
}
```

Response:
```json
{
  "success": true,
  "reference": "QIK-ABC123",
  "message": "Prompt sent"
}
```

### GET /payments/:reference
Check payment status.

Response (pending):
```json
{
  "success": true,
  "status": "PENDING"
}
```

Response (paid):
```json
{
  "success": true,
  "status": "PAID",
  "voucher": "QKHR-A1B2C3D4",
  "expiry": "2026-02-19 14:30"
}
```

### POST /vouchers/validate
Validate voucher code (for captive portal).

Request:
```json
{
  "code": "QKHR-A1B2C3D4",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

Response:
```json
{
  "valid": true,
  "expiresAt": "2026-02-19T14:30:00.000Z",
  "plan": "1hr"
}
```

## Windows Server Deployment

1. Install Node.js 18 LTS
2. Install MySQL 8.0
3. Clone repository
4. Copy `.env.example` to `.env` and configure
5. Run `npm install`
6. Run `npm run db:migrate`
7. Run `npm run build`
8. Use PM2 or IISNode to run: `npm start`

### Using PM2 (recommended)

```bash
npm install -g pm2
pm2 start dist/server.js --name qiknet
pm2 save
pm2 startup
```
