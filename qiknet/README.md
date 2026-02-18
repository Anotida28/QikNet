# QikNet WiFi Voucher Sales System

A minimal but functional WiFi voucher sales system for Zimbabwe, accepting EcoCash payments via Paynow.

## Project Structure

```
qiknet/
├── frontend/           # Static HTML frontend
│   ├── public/
│   │   └── index.html
│   └── README.md
├── backend/            # Node.js + TypeScript + Express API
│   ├── src/
│   ├── prisma/
│   ├── reference/      # Python sample code (reference only)
│   └── README.md
└── docs/               # Documentation and samples
```

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or pnpm

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Paynow credentials and database URL

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Frontend Setup

The frontend is a static HTML page. For development, serve it via the backend (Express serves static files from `frontend/public`).

For production, deploy to any static hosting or serve via Express.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pay` | Initiate EcoCash payment |
| GET | `/payments/:reference` | Check payment status |
| POST | `/vouchers/validate` | Validate voucher (for captive portal) |
| GET | `/admin/payments` | List payments (admin) |
| GET | `/admin/vouchers` | List vouchers (admin) |

## Environment Variables

See `backend/.env.example` for required configuration.

## License

Proprietary - Qiknet Digital Solutions
