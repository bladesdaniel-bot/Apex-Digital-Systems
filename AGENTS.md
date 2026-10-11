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
- Until a lead-delivery service is connected, show analysis requests as unavailable rather than pretending to send them.
- Pre-optimize the agency's Radix and icon dependencies with React at startup to prevent late dependency discovery from mixing React cache generations in an open preview.
- Mount the browser-only synthesized soundscape once in the root layout so navigation preserves playback; require an explicit music-button gesture to start sound and persist mute choices in browser storage.
- Keep fictional portfolio concepts in focused browser-safe components with reduced-motion-aware intersection reveals so the index remains maintainable.
- Keep full public app demos on /apps in a dedicated browser-safe showcase with CDN video pointers; the index may render a reduced-motion-aware linked preview so marketing and app browsing stay separate.
- Team tools live under the managed _authenticated layout; every team server function re-checks the caller's role from public.user_roles (only admin/telemarketer may generate briefs) because route guards don't protect RPC endpoints.
- Derive call-list batches through browser-safe queue helpers, applying the website selection to existing rows and ordering skips by row ID so actions on any visible card do not advance unrelated businesses.
- Check prospect websites in a server-only bounded fetch helper before insertion or legacy queue display; validate public DNS and each redirect, cap time/body/concurrency, and preserve Google URLs separately from reachability so failed checks never become no-website leads.
- Build orders are paid quotes (quotes.build_status set once by a server helper on first payment or $0 confirmation) so the owner alert fires exactly once; order photos live in a private bucket and are uploaded/read only through server functions with signed URLs.
- Keep the public offering list (services, pricing cards, analysis-form checkboxes) in one browser-safe module so the home page, AI brief copy and pricing tests cannot drift; per-project work carries no public starting price.
- Resolve Terminal visibility through the authenticated getMyAccess role check and fail closed; session presence alone does not prove team approval.
- Home-page advertisement loops use clean H.264 clips and noninteractive inline video without native controls to avoid recorded or mobile playback overlays.
- The sales rep of record on a customer (call_list.rep_*) is set server-side from the first teammate who saves its profile and copied onto quotes with appointment/expected-by, so credit never depends on manual entry or later editors.
- Quote sale commissions are recorded server-side once per quote (unique quote_id): automatically on first paid installment, or when the owner enters a sale amount on a $0/unpaid order; rep comes from call_list.rep_id, falling back to the quote creator, so pay never depends on manual matching.
- Split-payment parts after the first are charged off-session from the card saved at first checkout by a daily job plus an owner "charge now" action, using a pushed-forward due date and Stripe idempotency keys, so a replayed call never charges early or twice.
- The customer billing portal is reached only via a one-hour token emailed to the address on file (billing_links, service-role only), so knowing an email never opens someone's billing.
- Company expenses are owner-only (admin RLS + server has_role check); receipt images live in a private bucket accessed only via server functions with signed URLs.
