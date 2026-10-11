# Directory Tree

Full file layout of the Apex Digital Systems repository.

Back to the [README](README.md).

## Folder Guide

| Folder | What's inside |
|---|---|
| `drizzle/migrations/` | SQL migrations, the full history of the database schema |
| `public/` | Static files served as-is (flyer, team manual, favicon, robots.txt) |
| `src/assets/` | Images, plus pointer files for videos hosted on a CDN |
| `src/components/` | Site sections and team-portal UI |
| `src/components/ui/` | Reusable UI primitives (shadcn/ui on Radix) |
| `src/components/upgrade/` | Interactive home-page showcase pieces |
| `src/hooks/` | Shared React hooks |
| `src/integrations/supabase/` | Database clients, auth middleware, generated types |
| `src/lib/` | Business logic and server functions (quotes, billing, commissions, call list) |
| `src/lib/email-templates/` | Transactional email templates |
| `src/routes/` | File-based routes (each file is a page or endpoint) |
| `src/routes/_authenticated/` | Team portal pages; sign-in and role checks required |
| `src/routes/api/public/` | Stripe webhook, scheduled installment job, visit logging |
| `src/test/` | Vitest unit tests |
| `supabase/` | Supabase project config |

> The owner/admin sign-in pages and the auto-generated route list are intentionally kept out of this repository, so they don't appear below.

## Tree

```
Apex-Digital-Systems/
├── .lovable/
│   └── project.json
├── drizzle/
│   ├── migrations/
│   │   ├── meta/
│   │   │   ├── 0000_snapshot.json
│   │   │   ├── 0001_snapshot.json
│   │   │   ├── 0002_snapshot.json
│   │   │   ├── 0003_snapshot.json
│   │   │   ├── 0004_snapshot.json
│   │   │   ├── 0005_snapshot.json
│   │   │   ├── 0006_snapshot.json
│   │   │   ├── 0007_snapshot.json
│   │   │   ├── 0008_snapshot.json
│   │   │   ├── 0009_snapshot.json
│   │   │   ├── 0010_snapshot.json
│   │   │   ├── 0011_snapshot.json
│   │   │   ├── 0012_snapshot.json
│   │   │   ├── 0013_snapshot.json
│   │   │   ├── 0014_snapshot.json
│   │   │   ├── 0015_snapshot.json
│   │   │   ├── 0016_snapshot.json
│   │   │   ├── 0017_snapshot.json
│   │   │   ├── 0018_snapshot.json
│   │   │   ├── 0019_snapshot.json
│   │   │   ├── 0020_snapshot.json
│   │   │   ├── 0021_snapshot.json
│   │   │   ├── 0022_snapshot.json
│   │   │   ├── 0023_snapshot.json
│   │   │   ├── 0024_snapshot.json
│   │   │   ├── 0025_snapshot.json
│   │   │   ├── 0026_snapshot.json
│   │   │   ├── 0027_snapshot.json
│   │   │   ├── 0028_snapshot.json
│   │   │   ├── 0029_snapshot.json
│   │   │   ├── 0030_snapshot.json
│   │   │   └── _journal.json
│   │   ├── 0000_migration.sql
│   │   ├── 0001_create_form_submissions.sql
│   │   ├── 0002_team_auth_roles.sql
│   │   ├── 0003_migration.sql
│   │   ├── 0004_create_leads.sql
│   │   ├── 0005_allow_code_requests_without_account.sql
│   │   ├── 0006_add_lead_phone.sql
│   │   ├── 0007_visitor_logs.sql
│   │   ├── 0008_members_payments.sql
│   │   ├── 0009_payments_restrict_member_archived.sql
│   │   ├── 0010_add_suspended_role.sql
│   │   ├── 0011_create_commissions.sql
│   │   ├── 0012_recurring_commissions.sql
│   │   ├── 0013_call_list.sql
│   │   ├── 0014_call_list_brief.sql
│   │   ├── 0015_call_list_status.sql
│   │   ├── 0016_call_list_website_checks.sql
│   │   ├── 0017_add_lead_location.sql
│   │   ├── 0018_call_list_customer_profile.sql
│   │   ├── 0019_quotes.sql
│   │   ├── 0020_quote_free_first_month.sql
│   │   ├── 0021_build_orders.sql
│   │   ├── 0022_employee_ids_appointments.sql
│   │   ├── 0023_create_call_list_skips.sql
│   │   ├── 0024_commission_quote_link.sql
│   │   ├── 0025_billing_gaps.sql
│   │   ├── 0026_cancellations.sql
│   │   ├── 0027_company_expenses.sql
│   │   ├── 0028_contractor_tax_info.sql
│   │   ├── 0029_site_settings_w9_toggle.sql
│   │   └── 0030_site_settings_admin_write.sql
│   └── schema.ts
├── public/
│   ├── apex-flyer.pdf
│   ├── apex-team-manual.pdf
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   │   ├── aetheris-network.jpg
│   │   ├── aetheris-swarm.jpg
│   │   ├── aetheris-vault.jpg
│   │   ├── ai-reader-dictator.jpg.asset.json
│   │   ├── ai-reader-dictator.mp4.asset.json
│   │   ├── ai-reader-dictator.webm.asset.json
│   │   ├── apex-app-demo-poster.jpg.asset.json
│   │   ├── apex-app-demo.mp4.asset.json
│   │   ├── apex-apps-preview-clean.jpg.asset.json
│   │   ├── apex-apps-preview-clean.mp4.asset.json
│   │   ├── apex-apps-preview-clean.webm.asset.json
│   │   ├── apex-apps-preview-v2.jpg.asset.json
│   │   ├── apex-apps-preview-v2.mp4.asset.json
│   │   ├── apex-apps-preview-v2.webm.asset.json
│   │   ├── apex-apps-preview.jpg.asset.json
│   │   ├── apex-apps-preview.mp4.asset.json
│   │   ├── apex-apps-preview.webm.asset.json
│   │   ├── apex-assembly-line-ad-poster.jpg.asset.json
│   │   ├── apex-assembly-line-ad.mp4.asset.json
│   │   ├── apex-assembly-line-ad.webm.asset.json
│   │   ├── apex-assembly-line-clean.jpg.asset.json
│   │   ├── apex-assembly-line-clean.mp4.asset.json
│   │   ├── apex-assembly-line-clean.webm.asset.json
│   │   ├── apex-assembly-line-v2.jpg.asset.json
│   │   ├── apex-assembly-line-v2.mp4.asset.json
│   │   ├── apex-assembly-line-v2.webm.asset.json
│   │   ├── apex-flyer-animated-poster.jpg.asset.json
│   │   ├── apex-flyer-animated.mp4.asset.json
│   │   ├── apex-flyer-clean.webm.asset.json
│   │   ├── apex-flyer-fixed.png
│   │   ├── apex-flyer-loop.mp4.asset.json
│   │   ├── apex-flyer-poster.jpg.asset.json
│   │   ├── apex-flyer-web.jpg
│   │   ├── apex-flyer.jpg.asset.json
│   │   ├── apex-flyer.pdf.asset.json
│   │   ├── apex-neon-flyer-poster-1000.jpg
│   │   ├── apex-neon-flyer-poster.jpg.asset.json
│   │   ├── apex-neon-flyer.mp4.asset.json
│   │   ├── apex-neon-flyer.webm.asset.json
│   │   ├── bmi-calculator.jpg.asset.json
│   │   ├── bmi-calculator.mp4.asset.json
│   │   ├── bmi-calculator.webm.asset.json
│   │   ├── nevada-gateway.jpg
│   │   ├── pll-hero.jpg
│   │   ├── pll-vial.jpg
│   │   └── team-manual.pdf.asset.json
│   ├── components/
│   │   ├── ui/
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   └── tooltip.tsx
│   │   ├── upgrade/
│   │   │   ├── LeadExtras.tsx
│   │   │   ├── NeuralCanvas.tsx
│   │   │   ├── RevenueEngine.tsx
│   │   │   ├── SwarmFeed.tsx
│   │   │   └── TerminalMode.tsx
│   │   ├── AdLoop.tsx
│   │   ├── AetherisConcept.tsx
│   │   ├── AmbientMusic.tsx
│   │   ├── AppsPreview.tsx
│   │   ├── AppsShowcase.tsx
│   │   ├── CustomerProfilePanel.tsx
│   │   ├── FlyerReel.tsx
│   │   ├── HighlightReader.tsx
│   │   ├── Markdown.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── TaxInfoForm.tsx
│   │   ├── TeamShell.tsx
│   │   ├── ViewCounter.tsx
│   │   └── VisitTracker.tsx
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── integrations/
│   │   └── supabase/
│   │       ├── auth-attacher.ts
│   │       ├── auth-middleware.ts
│   │       ├── client.server.ts
│   │       ├── client.ts
│   │       ├── cron-auth.ts
│   │       ├── previewAuthStorage.ts
│   │       └── types.ts
│   ├── lib/
│   │   ├── email-templates/
│   │   │   ├── billing-link.tsx
│   │   │   ├── build-order.tsx
│   │   │   ├── lead-notification.tsx
│   │   │   ├── registry.ts
│   │   │   ├── send-email.ts
│   │   │   ├── team-alert.tsx
│   │   │   └── team-invite-code.tsx
│   │   ├── billing.functions.ts
│   │   ├── build-order.server.ts
│   │   ├── call-cities.ts
│   │   ├── call-list.functions.ts
│   │   ├── call-list.ts
│   │   ├── cancellations.functions.ts
│   │   ├── commission.ts
│   │   ├── commissions.functions.ts
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   ├── expenses.functions.ts
│   │   ├── expenses.ts
│   │   ├── geo.server.ts
│   │   ├── geo.ts
│   │   ├── installments.server.ts
│   │   ├── installments.ts
│   │   ├── invite.functions.ts
│   │   ├── lead-brief.server.ts
│   │   ├── lead-location.server.ts
│   │   ├── lead.functions.ts
│   │   ├── lovable-error-reporting.ts
│   │   ├── member-sync.ts
│   │   ├── offers.ts
│   │   ├── order-limits.ts
│   │   ├── orders.functions.ts
│   │   ├── owner-email.ts
│   │   ├── quote.ts
│   │   ├── quotes.functions.ts
│   │   ├── receipt-scan.server.ts
│   │   ├── signup-alert.functions.ts
│   │   ├── site-audit.ts
│   │   ├── stripe.server.ts
│   │   ├── stripe.ts
│   │   ├── tax-info.functions.ts
│   │   ├── tax-info.ts
│   │   ├── team-access.ts
│   │   ├── team.functions.ts
│   │   ├── utils.ts
│   │   ├── visit-format.ts
│   │   ├── website-check.server.ts
│   │   └── website-check.ts
│   ├── routes/
│   │   ├── _authenticated/
│   │   │   ├── route.tsx
│   │   │   ├── team.brief.tsx
│   │   │   ├── team.calls.tsx
│   │   │   ├── team.cancellations.tsx
│   │   │   ├── team.earnings.tsx
│   │   │   ├── team.expenses.tsx
│   │   │   ├── team.manual.tsx
│   │   │   ├── team.offerings.tsx
│   │   │   ├── team.orders.tsx
│   │   │   ├── team.quotes.tsx
│   │   │   └── team.visitors.tsx
│   │   ├── api/
│   │   │   └── public/
│   │   │       ├── hooks/
│   │   │       │   └── charge-installments.ts
│   │   │       ├── payments/
│   │   │       │   └── webhook.ts
│   │   │       └── log-visit.ts
│   │   ├── lovable/
│   │   │   └── email/
│   │   │       └── transactional/
│   │   │           └── preview.ts
│   │   ├── __root.tsx
│   │   ├── apps.tsx
│   │   ├── billing.tsx
│   │   ├── checkout.return.tsx
│   │   ├── index.tsx
│   │   ├── pay.$quoteId.tsx
│   │   └── README.md
│   ├── test/
│   │   ├── aetheris-pricing.test.ts
│   │   ├── app-routing.test.tsx
│   │   ├── call-list.test.ts
│   │   ├── commission.test.ts
│   │   ├── expenses.test.ts
│   │   ├── form-tracking.test.ts
│   │   ├── geo.test.ts
│   │   ├── installments.test.ts
│   │   ├── member-sync.test.ts
│   │   ├── offers.test.ts
│   │   ├── order-photo-limit.test.ts
│   │   ├── quote.test.ts
│   │   ├── setup.ts
│   │   ├── tax-info.test.ts
│   │   ├── team-access.test.ts
│   │   ├── upgrade.test.ts
│   │   ├── view-tracking.test.ts
│   │   ├── visit-format.test.ts
│   │   └── website-check.test.ts
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── supabase/
│   └── config.toml
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── AGENTS.md
├── bun.lock
├── bunfig.toml
├── components.json
├── DIRECTORY_TREE.md
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── README.md
├── roadmap.md
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```
