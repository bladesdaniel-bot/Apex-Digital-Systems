<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the agency foundation on the index route, with reusable design-system button variants and global semantic tokens so its visual identity stays consistent.
- Reuse HiringSpotlight on the home and advertising pages; applications are emailed to the owner by a public server function using the fixed-recipient team-alert template.
- Until a lead-delivery service is connected, show analysis requests as unavailable rather than pretending to send them.
- Pre-optimize the agency's Radix and icon dependencies with React at startup to prevent late dependency discovery from mixing React cache generations in an open preview.
- Mount ambient playback once in the root layout so navigation preserves it; use a CDN audio recording for Haunted Mode and browser synthesis for normal music, retaining saved mute choices and browser-policy-aware haunted autoplay.
- Keep full public app demos on /apps in a dedicated browser-safe showcase with CDN video pointers; the index may render a reduced-motion-aware linked preview so marketing and app browsing stay separate.
- Team tools live under the managed _authenticated layout; every team server function re-checks the caller's role from public.user_roles (only admin/telemarketer may generate briefs) because route guards don't protect RPC endpoints.
- Derive call-list batches through browser-safe queue helpers, applying the website selection to existing rows and ordering skips by row ID so actions on any visible card do not advance unrelated businesses.
- Check prospect websites in a server-only bounded fetch helper before insertion or legacy queue display; validate public DNS and each redirect, cap time/body/concurrency, and preserve Google URLs separately from reachability so failed checks never become no-website leads.
- Build orders are quotes with build_status set once by markBuildReady (rep "place order" before payment, first payment, or $0 confirmation) so the owner alert fires exactly once; the rep commission is recorded only when money clears; pricing edits by the writing rep/owner lock after the first payment; order photos live in a private bucket accessed only through server functions with signed URLs.
- Use shared order-draft validation for optional unpaid business names and incomplete-order detection; incomplete unpaid orders stay in Holding so placeholder orders do not enter the ready build queue.
- Keep offerings, package inclusions and numeric billing amounts in one browser-safe module; derive Build Order package/membership selections from it so public pricing and order defaults cannot drift. Per-project work carries no public starting price.
- Resolve Terminal visibility through the authenticated getMyAccess role check and fail closed; session presence alone does not prove team approval.
- Home-page advertisement loops use clean H.264 clips and noninteractive inline video without native controls to avoid recorded or mobile playback overlays.
- The sales rep of record on a customer (call_list.rep_*) is set server-side from the first teammate who saves its profile and copied onto quotes with appointment/expected-by, so credit never depends on manual entry or later editors.
- Accrue commissions per settled installment with a unique order/installment key; keep legacy whole-order records unchanged and suppress duplicate credit. Monthly invoices use server-tagged product categories and the order's rep, excluding tax and pass-through costs, so monthly-only orders also earn correctly.
- Preserve add-on cadence and billing category through order editing and checkout; derive listed options from shared offerings so ad budgets never become commissionable service fees.
- Split-payment parts after the first are charged off-session from the card saved at first checkout by a daily job plus an owner "charge now" action, using a pushed-forward due date and Stripe idempotency keys, so a replayed call never charges early or twice.
- The customer billing portal is reached only via a one-hour token emailed to the address on file (billing_links, service-role only), so knowing an email never opens someone's billing.
- Company expenses are owner-only (admin RLS + server has_role check); receipt images live in a private bucket accessed only via server functions with signed URLs.
- Timecards are derived from team_shifts (portal heartbeat clock-in, sign-out clock-out, 30-min idle auto-end) and calls from append-only call_log written in markCalled, so owner reports survive queue recalls.
- Scheduled call-backs (call_list.callback_at set) stay out of the shared queue and private to their scheduler/admin until a call outcome or explicit cancel clears them, so a due call-back never disappears or leaks to other reps.
- Skipped call-list businesses form a per-caller Skipped pool (call_list_skips) excluded from that caller's queue until returned; missing Google Maps websites are searched for (Places re-query, then Parallel web search) and accepted only when the page matches the business's phone or name+domain, so leads aren't wrongly marked no-website.
- Customer portal accounts use the 'client' role and see only quotes linked in client_links; portal tables (client_invites/links/requests/activity) are service-role only and reached through server functions that re-check that link, so customers can never read other orders or team data.
