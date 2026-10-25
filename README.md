# Bpa-web-development
Official BPA Web Development team repository for designing, developing, and managing competitive web projects using HTML, CSS, JavaScript, JSON, and related technologies.

**Marlowby: Explore Your City, One Box at a Time.** Built for the BPA 365 Website Design and Development Team event. Live at https://marlowbybox.vercel.app

## How the site is put together

| Part | Where | What it does |
| --- | --- | --- |
| Pages | `index.html`, `html/*.html` | Plain HTML5 pages, one per section |
| Styles | `css/` | One stylesheet per page, plus shared `variables.css`, `style.css`, `navbar.css`, `nav-footer.css`, and `polish.css` (shared finish for every page except Home and Our Mission) |
| Scripts | `js/` | Vanilla JavaScript, no framework |
| Shared navbar | `partials/navbar.html`, `css/navbar.css`, `js/navbar.js` | One navbar template copied into every page |
| Backend | `api/` | Vercel serverless functions (Node.js) for accounts, orders, help desk and newsletter |
| Database | `api/_lib/schema.sql` | PostgreSQL tables (hosted on Neon) |
| Data | `data/plans.json` | Plan prices and promo codes, read by both the pages and the backend |

## The shared navbar

The navbar markup lives in **one file**: `partials/navbar.html`. To change a link, edit that file and run:

```bash
npm run nav:sync     # copies the navbar into every page
npm run nav:check    # fails if any page's navbar is out of date
```

Every page gets identical markup between `<!-- site-nav:start -->` and `<!-- site-nav:end -->`. `js/navbar.js` marks the current page, runs the dropdowns and the phone menu, and shows the cart count and the signed-in name. New pages only need a `<link rel="stylesheet" href="/css/style.css">` in the head and an empty marker block where the navbar goes; `nav:sync` adds the rest.

## Running it on your computer

You need [Node.js 22](https://nodejs.org).

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 15 automated tests for the backend
```

With no `.env.local`, the dev server uses a built-in local database stored in `.data/` (PGlite), and emails are printed in the terminal instead of being sent. To use the real database and email, copy `.env.example` to `.env.local` and fill it in (or run `vercel env pull .env.local`).

## Deploying on Vercel

The project stays a static site with an `api/` folder, so Vercel's **Other** framework preset works with no build command.

1. **Database.** In the Vercel dashboard, open the project, go to **Storage**, and create a **Neon** Postgres database connected to this project. Vercel adds `DATABASE_URL` for you.
2. **Tables.** Either paste `api/_lib/schema.sql` into Neon's SQL Editor and run it, or run locally:
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   npm install
   npm run db:migrate
   ```
3. **Email (Gmail).** Sign in to marlowbybox@gmail.com, turn on **2-Step Verification** (Google Account > Security), then open https://myaccount.google.com/apppasswords, create an app password named "Marlowby site" and copy the 16 characters.
4. **Environment variables.** In **Settings > Environment Variables**, add the variables below for Production and Preview.
5. **Deploy.** Push to GitHub (or run `vercel --prod`), then open `https://marlowbybox.vercel.app/api/health`. It reports whether the database and email are set up.
6. **Judges' login.** With `.env.local` pointing at the production database:
   ```bash
   npm run account:create -- "BPA Judge" judge@yourdomain.com "PickAStrongPassw0rd"
   ```
   Put these credentials in the submission PDF.

### Environment variables

| Name | Required | Example | Used for |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Accounts, sessions, orders, tickets, newsletter. Added automatically by the Neon integration. |
| `GMAIL_USER` | For email | `marlowbybox@gmail.com` | The Gmail account that sends every email. Also the team inbox. |
| `GMAIL_APP_PASSWORD` | For email | `abcd efgh ijkl mnop` | Google App Password for that account (never the normal password) |
| `SUPPORT_EMAIL` | No | `team@yourdomain.com` | Send team notices somewhere other than `GMAIL_USER` |
| `EMAIL_FROM_NAME` | No | `Marlowby` | Name shown next to the Gmail address |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | `re_123...`, `Marlowby <hello@yourdomain.com>` | Alternative to Gmail, used only when the Gmail variables are empty |
| `APP_URL` | Recommended | `https://marlowbybox.vercel.app` | Links inside emails |
| `ALLOWED_ORIGINS` | No | `https://www.yourdomain.com` | Extra site addresses allowed to call the API (comma-separated) |
| `SESSION_DAYS` | No | `30` | How long a sign-in lasts |

Without the email variables, everything still works and emails are skipped (and logged).

### Who gets which email

| Event | Customer gets | marlowbybox@gmail.com gets |
| --- | --- | --- |
| Help desk ticket | "We got your message (HD-...)" | "[Help desk] HD-... · Topic · Name" with the message. Hit reply to answer the customer. |
| Order (real or test email) | "Order MB-... is confirmed" | "New order MB-...: $59 from Name" |
| New account | "Welcome Name to Marlowby" | "New account: Welcome Full Name to Marlowby" |
| Newsletter signup | Welcome code PASSPORT10 | Nothing |

Gmail allows about 500 emails a day from a regular account, which is plenty for judging.

## Backend API

All endpoints take and return JSON. State-changing requests must be `Content-Type: application/json` and come from this site.

| Method and path | What it does |
| --- | --- |
| `POST /api/auth/register` | Create an account `{name, email, password}`, sign in, send a welcome email and a notice to the team inbox |
| `POST /api/auth/login` | Sign in `{email, password}` |
| `POST /api/auth/logout` | Sign out and revoke the session |
| `GET /api/auth/me` | The signed-in user, or `null` |
| `GET / PATCH / DELETE /api/account` | Read, update `{name, zip}`, or delete `{password}` the account |
| `GET / POST /api/orders` | List your orders, or place one `{name, email, zip, items, promo}`, email a confirmation and notify the team inbox |
| `POST /api/contact` | Help desk ticket: saved, forwarded to the team inbox (reply-to set to the customer), confirmation to the customer |
| `POST / DELETE /api/newsletter` | Subscribe (welcome email with code) or unsubscribe |
| `GET /api/health` | Setup check |

### Security choices

- Passwords are hashed with **bcrypt (cost 12)** and never stored or logged as text. Passwords over 72 bytes are rejected because bcrypt ignores the rest.
- Sessions are random 256-bit tokens in an `HttpOnly; Secure; SameSite=Lax` cookie. Only a SHA-256 hash of the token is stored, and signing out deletes it on the server.
- Every input is validated again on the server. Orders are re-priced from `data/plans.json`, so the browser can't change a price.
- Sign-in, sign-up, help desk and newsletter requests are rate limited in the database (for example 8 wrong passwords per email per 15 minutes).
- Cross-site requests are refused (JSON-only plus an Origin check), all queries are parameterized, and every visitor value is escaped in emails.

## Team notes

- Home (`index.html`) and Our Mission (`html/our-mission.html`) belong to teammates. Only their navbar is generated; leave their content to them.
- Cite any new image, font, library or source on `html/works-cited.html`.
- `html/privacy.html` lists every cookie and storage key the site uses. If you add one, add it there too. The cookie notice lives in `js/navbar.js` (bump `NOTICE_VERSION` to show it again after a policy change).
