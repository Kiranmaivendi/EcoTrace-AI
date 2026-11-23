# EcoTrace AI — Digital Product Passport

EcoTrace AI gives products a digital identity that can be opened from a QR code. The app includes consumer passport lookup, manufacturer product registration, account verification, admin review tools, and passport-grounded AI assistance.

Product records begin **unverified**. Environmental figures, manufacturer references, and AI screenings are not presented as verified unless an authorized admin records that status. AI image screening is a visual comparison only; it is not forensic authentication.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB 7+ (local or hosted)
- Resend account and verified sender for email OTP/password reset
- OpenAI-compatible API key for AI responses; a vision-capable model is needed for image comparison

## Local setup

From the project root:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The Vite frontend is available at `http://127.0.0.1:5173`; the Express API listens on `http://127.0.0.1:3001`. The frontend proxies `/api` and `/uploads` to the backend.

Set these values in `.env`:

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Random secret of at least 32 bytes for signed auth cookies |
| `FRONTEND_URL` | Yes | Allowed browser origin, e.g. `http://127.0.0.1:5173` |
| `PUBLIC_APP_URL` | Yes | Public site origin embedded into generated QR codes |
| `COOKIE_SECURE` | Production | Set `true` when the site uses HTTPS |
| `RESEND_API_KEY` | For OTP and password reset | Resend API credential; keep server-side |
| `EMAIL_FROM` | For OTP and password reset | Verified sender address |
| `OPENAI_API_KEY` | For AI features | Server-side API key |
| `OPENAI_MODEL` | For AI assistant | Chat model supported by your provider |
| `OPENAI_VISION_MODEL` | For image screening | Vision-capable model supported by your provider |

Use different, strong secrets and service credentials per environment. Never put `.env` or API keys in the frontend.

## Available commands

```powershell
npm run dev
npm run build
npm run lint
npm test
npm audit
```

`npm run build` builds the Vite app. `npm test` runs the backend Node test suite. The API health endpoints are `GET /api/health/live` (process liveness) and `GET /api/health` (MongoDB readiness).

## Product and account flows

- Register consumer or manufacturer accounts, confirm email OTP, sign in/out, and request a password reset.
- Manufacturer accounts can register and update products, generate passport QR codes, and see their product activity. New or edited product records are unverified until reviewed.
- Product passports are publicly viewable by product ID. Product search and QR camera/image scanning link to the same passport.
- Signed-in users can report passport issues. Admins can update issue status, user roles, product review status, and manufacturer reference records.
- Admins should only verify values after reviewing evidence. Carbon figures without a source are rejected; carbon verification is separate from product verification.
- The AI assistant retrieves the selected passport's stored facts and must state when data is missing. It is unavailable without an AI provider key.
- Image screening requires a verified manufacturer reference image and a configured vision model. The response has no confidence score and cannot establish authenticity.

## API outline

- `/api/auth` — registration, OTP verification, login/logout, session and password reset
- `/api/products` — public search/passports; protected product registration, updates and reports
- `/api/dashboard` — role-scoped dashboard data
- `/api/admin` — admin-only user, manufacturer, product and issue management
- `/api/ai` — passport-grounded assistant and reference-image visual screening

All protected routes use an HTTP-only JWT cookie and server-side role checks. Inputs are validated by the API. Product and reference images are limited to JPEG, PNG, or WebP up to 5 MB.

## Deployment notes

Deploy the frontend and API behind HTTPS, configure `FRONTEND_URL` to the exact frontend origin, and set `PUBLIC_APP_URL` to the public frontend origin. Set `COOKIE_SECURE=true` in production. Provision MongoDB and configure email and AI provider credentials as platform secrets.

Uploaded images are stored on the backend filesystem for this development implementation. Production deployments with ephemeral or multiple API instances should replace local uploads with durable object storage and configure backups/retention. Configure logging, monitoring, rate limits, and database backups before production use.
