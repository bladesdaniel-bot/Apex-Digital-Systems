# Apex Digital Systems

**A full-stack business platform for a web design and digital marketing agency: a public marketing site, a lead pipeline, quoting and payments, and a role-based team portal for a commission-based sales team.**

🌐 Live site: [apexdigitalsystems.org](https://apexdigitalsystems.org)

---

## Overview

Apex Digital Systems is a Reno, Nevada agency that builds websites, local SEO, and custom apps for small businesses. This repository is the platform that runs the business end to end:

1. **Attract.** A public marketing site with animated ads, a services and pricing board, and a free business-analysis form.
2. **Prospect.** A shared call list that finds local businesses, checks whether their website actually works, and generates an AI sales brief for each one.
3. **Close.** Reps build quotes. Customers pay in full or in installments through Stripe, and the first payment automatically creates a build order.
4. **Run.** Commissions, renewals, cancellations, expenses, contractor tax info, and visitor analytics, all scoped by role.

## Features

### Public site

- Marketing home page with services, pricing, and lead capture
- Animated flyer and ad loops that respect reduced-motion settings
- Custom app demo showcase
- Customer payment page per quote, with secure card checkout
- Customer billing portal opened by a one-time emailed link

### Team portal (sign-in required, role-based)

- **Call list:** batches of local businesses by type and city, with live website-status checks and a customer profile for each
- **AI sales briefs:** strategy notes and site audits generated for each prospect
- **Quotes and orders:** a quote builder, split payments, $0 confirmations, build-order tracking, and photo uploads
- **Earnings:** sale commissions plus recurring renewal commissions, credited automatically to the rep of record
- **Cancellations:** a request form plus an owner review queue
- **Expenses:** owner-only company expenses with receipt scanning
- **Team manual and offerings:** onboarding and sales reference pages
- **Visitor log:** site traffic with approximate location

### Automation

- Transactional emails for new leads, team alerts, invite codes, build orders, and billing links
- A daily scheduled job that charges due installments from the card saved at first checkout
- Stripe webhook handling for payments, refunds, and renewals

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React, server functions, file-based routing) |
| Language | TypeScript |
| UI | React, Tailwind CSS, Radix UI, shadcn/ui, Recharts |
| Database & Auth | Supabase (PostgreSQL, Row Level Security, Storage) |
| Migrations | Drizzle (SQL migrations) |
| Payments | Stripe (Checkout, saved cards, off-session charges, webhooks) |
| AI | Vercel AI SDK (lead briefs, site audits, receipt scanning) |
| Email | React Email templates |
| Testing | Vitest and Testing Library |
| Hosting | Cloudflare |

## Engineering Highlights

- **Authorization on the server, not just the UI.** Every team server function re-checks the caller's role from the database, because route guards alone don't protect API endpoints. Role checks fail closed.
- **Row Level Security everywhere.** Owner-only data, such as expenses and settings, is enforced in PostgreSQL policies as well as in code.
- **Payments that can't double-charge.** Installments use Stripe idempotency keys and pushed-forward due dates, so a retried job never charges early or twice.
- **Exactly-once business events.** Build orders and sale commissions are recorded once per quote, enforced with unique constraints, so alerts and payouts never duplicate.
- **Safe outbound requests.** Website checks validate public DNS and every redirect, and they cap time, response size, and concurrency to guard against server-side request forgery (SSRF).
- **Private files stay private.** Order photos and receipts live in private storage buckets and are served only through server functions as short-lived signed URLs.
- **Token-based billing access.** The customer billing portal opens only through a one-hour token emailed to the address on file, so knowing someone's email never exposes their billing.
- **Single source of truth.** Services and pricing live in one shared module, so the home page, AI briefs, and tests can't drift apart.

## Project Structure

```
src/
├── components/        # UI components (site sections, team shell, shadcn/ui)
├── integrations/      # Supabase clients and auth middleware
├── lib/               # Business logic and server functions
│   └── email-templates/
├── routes/            # File-based routes
│   ├── _authenticated/   # Team portal (role-protected)
│   └── api/public/       # Webhooks and scheduled jobs
└── test/              # Vitest unit tests
drizzle/migrations/    # Database schema history (SQL)
public/                # Static assets
```

For the complete file-by-file layout, see [DIRECTORY_TREE.md](DIRECTORY_TREE.md).

> **Note:** The owner/admin sign-in pages are intentionally left out of this public repository for security.

## Getting Started

**Requirements:** Node.js 20+ (or Bun), plus a Supabase project and a Stripe account for full functionality.

```sh
git clone https://github.com/bladesdaniel-bot/Apex-Digital-Systems.git
cd Apex-Digital-Systems
npm install
cp .env.example .env    # then fill in your own values
npm run dev
```

### Environment variables

See `.env.example` for the full list. The main ones are:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase connection (browser) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase connection (server only) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Stripe publishable key |
| `VITE_OWNER_EMAIL` | Owner email for alerts and admin access |
| `GOOGLE_MAPS_API_KEY` | Business lookups for the call list |

Real values are never committed. `.env` is ignored by git.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run test` | Run the test suite (97 tests across 19 files) |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

## Author

**Daniel Blades**, Software Engineer / Systems Architect


---

© 2026 Apex Digital Systems. All rights reserved.
