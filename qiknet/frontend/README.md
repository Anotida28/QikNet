# QikNet Frontend

Static HTML frontend for the QikNet WiFi voucher sales system.

## Structure

```
frontend/
├── public/
│   └── index.html    # Main purchase page
├── assets/           # Images, icons (if any)
└── README.md
```

## Development

The backend serves this folder as static files. No build step required.

For local development:
1. Start the backend server
2. Access http://localhost:3000

## Configuration

The frontend uses same-origin API calls (`/pay`, `/payments/:ref`).

If deploying frontend separately, update `YOUR_FUNCTION_URL` in index.html.
