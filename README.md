# TeleAuth — Vercel Edition

Zero-friction cross-device authentication via Telegram deep-link OTP.  
Fully serverless — runs on Vercel + Neon (or Supabase) PostgreSQL.

---

## What Changed From the Express Version

| Concern | Express version | This (Vercel) version |
|---|---|---|
| Server | `express` persistent process | Vercel serverless functions |
| Routes | `src/routes/*.js` | `api/**/*.js` (one file = one endpoint) |
| Telegram bot | Telegraf long-polling process | Webhook via `/api/bot/webhook` |
| Queue (BullMQ) | Redis + BullMQ worker | Removed — Telegram called directly |
| SSE real-time | In-memory SSE client map | Removed — frontend polls `/api/auth/session-status` every 3s |
| HTML views | `src/views/*.html` | `public/*.html` (served as static files) |
| Redis | Required | Not needed |
| Database | Any PostgreSQL | Neon or Supabase (serverless-friendly) |

---

## Quick Start (Local Dev)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` + `DIRECT_URL` — from Neon or Supabase (see below)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — random 32+ char strings
- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_BOT_NAME` — your bot's username
- `APP_URL` — `http://localhost:3000` for local dev

### 3. Set up the database (Neon — free tier)

1. Go to [neon.tech](https://neon.tech) → create a project
2. Copy the **connection string** → `DATABASE_URL`
3. Copy the **direct connection string** → `DIRECT_URL`

```bash
npm run db:push    # push schema to database
npm run db:seed    # create demo user
```

Demo credentials: `demo@teleauth.com` / `Password123!`

### 4. Run locally

```bash
npm run dev        # starts vercel dev on http://localhost:3000
```

---

## Deploy to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/teleauth.git
git push -u origin main
```

### Step 2: Import project in Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework preset: **Other**
4. Click **Deploy** (it will fail — that's OK, we need env vars first)

### Step 3: Add environment variables

In Vercel dashboard → **Settings → Environment Variables**, add all variables from `.env.example`:

```
APP_URL                  = https://your-project.vercel.app
DATABASE_URL             = postgresql://...
DIRECT_URL               = postgresql://...
JWT_ACCESS_SECRET        = ...
JWT_REFRESH_SECRET       = ...
TELEGRAM_BOT_TOKEN       = ...
TELEGRAM_BOT_NAME        = ...
TELEGRAM_WEBHOOK_SECRET  = some_random_string
SETUP_SECRET             = another_random_string
OTP_EXPIRY_MINUTES       = 5
NODE_ENV                 = production
```

### Step 4: Redeploy

Vercel dashboard → **Deployments** → click the latest → **Redeploy**.

### Step 5: Run database migrations

```bash
# Point to your production DB (with DIRECT_URL set in .env)
npm run db:migrate
npm run db:seed
```

### Step 6: Register the Telegram webhook

Visit this URL in your browser **once** after deploying:

```
https://your-project.vercel.app/api/bot/setup?secret=YOUR_SETUP_SECRET
```

You should see:
```json
{ "success": true, "message": "Webhook registered!", "info": { ... } }
```

That's it — Telegram will now call your `/api/bot/webhook` endpoint for every message.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Validate password, send Telegram OTP |
| `GET`  | `/api/auth/telegram-verify?token=` | Verify OTP from deep-link, issue JWT |
| `POST` | `/api/auth/refresh-token` | Rotate access + refresh tokens |
| `POST` | `/api/auth/logout` | Revoke session |
| `GET`  | `/api/auth/me` | Get current user (protected) |
| `GET`  | `/api/auth/session-status?sessionId=` | Poll session confirmation |
| `POST` | `/api/auth/login-for-link` | Password auth for link-telegram page |
| `POST` | `/api/auth/link-telegram-request` | Generate Telegram link code (protected) |
| `POST` | `/api/bot/webhook` | Telegram webhook receiver |
| `GET`  | `/api/bot/setup?secret=` | Register webhook (run once) |
| `POST` | `/api/notifications/test` | Send test Telegram message (protected) |
| `GET`  | `/api/meta` | Bot name for frontend |

---

## How to Link Your Telegram Account

1. Start your bot on Telegram: `@YourBotName` → `/start`
2. Visit `https://your-project.vercel.app/link-telegram`
3. Enter your email, password, and Telegram Chat ID
   - Get your Chat ID by messaging [@userinfobot](https://t.me/userinfobot)
4. A code appears — send `/link <code>` to your bot in Telegram
5. You're linked! Test the full login flow at `/login`

---

## Project Structure

```
api/
├── auth/
│   ├── register.js
│   ├── login.js
│   ├── telegram-verify.js
│   ├── refresh-token.js
│   ├── logout.js
│   ├── me.js
│   ├── session-status.js
│   ├── login-for-link.js
│   └── link-telegram-request.js
├── bot/
│   ├── webhook.js          ← Telegram sends all messages here
│   └── setup.js            ← Register webhook (run once)
├── notifications/
│   └── test.js
└── meta.js
lib/
├── config/
│   ├── prisma.js           ← Singleton Prisma client
│   └── constants.js
├── middleware/
│   ├── auth.js             ← JWT cookie verification
│   └── cors.js             ← CORS + cookie helpers
└── services/
    ├── jwtService.js
    ├── otpService.js
    ├── sessionService.js
    ├── telegramService.js  ← Direct Telegram API calls (no bot process)
public/
├── login.html
├── dashboard.html
└── link-telegram.html
prisma/
├── schema.prisma
└── seed.js
vercel.json
```

---

## Generating Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this 4 times to get values for:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`
- `SETUP_SECRET`

---

## Troubleshooting

**Login says "No Telegram account linked"**
→ You haven't linked Telegram yet. Visit `/link-telegram`.

**Telegram messages not arriving**
→ Check `TELEGRAM_BOT_TOKEN` is correct in Vercel env vars. Check `/api/bot/setup` was called.

**Webhook not receiving messages**
→ Visit `https://your-project.vercel.app/api/bot/setup?secret=YOUR_SETUP_SECRET` again.

**Database errors**
→ Ensure `DATABASE_URL` uses the pooled connection and `DIRECT_URL` uses the direct connection (Neon/Supabase requirement for Prisma).

**"Invalid credentials" on seed user**
→ Re-run `npm run db:seed` pointing at your production DB.
