# FamilyGuard Backend (Node.js + Express)

## Security-first principles
- Consent-based enrollment only (pairing code + transparency notice version)
- Parent JWT authentication and device token authentication
- Rate limiting, Helmet hardening, CORS restrictions
- Real-time updates through Socket.IO for parent dashboard

## Run locally
1. Copy `.env.example` to `.env`
2. Set `PAIRING_CODE` and other variables
3. Install and run:
   - `npm install`
   - `npm run dev`

## Main API groups
- `/api/auth/*` - parent register/login
- `/api/device/*` - child device enrollment and sync
- `/api/parent/*` - dashboard data and remote actions
