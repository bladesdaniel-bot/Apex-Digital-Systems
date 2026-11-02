import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getOrderClientInfo, resolveClientRequest, sendClientInvite, uploadSignedAgreement } from "@/lib/client-portal.functions";
import { ptDate } from "@/lib/visit-format";

/** Team view of an order's customer side: signed agreement upload, portal account invite and change requests. */
export function OrderClientSection({ quoteId, canManage, onChanged }: { quoteId: string; canManage: boolean; onChanged: () => void }) {
  const qc = useQueryClient();
  const get = useServerFn(getOrderClientInfo);
  const info = useQuery({ queryKey: ["order-client", quoteId], queryFn: () => get({ data: { quoteId } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["order-client", quoteId] });
  const upSigned = useServerFn(uploadSignedAgreement);
  const invite = useServerFn(sendClientInvite);
  const inv = useMutation({ mutationFn: () => invite({ data: { quoteId } }), onSuccess: refresh });
  const resolve = useServerFn(resolveClientRequest);
  const done = useMutation({ mutationFn: (id: string) => resolve({ data: { id } }), onSuccess: refresh });
  const d = info.data;
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer portal</p>
      {canManage && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Signed agreement (photo or PDF) — a copy shows in the customer's account.</p>
          <PhotoUpload allowPdf label="Upload signed agreement" upload={async f => { await upSigned({ data: { quoteId, file: f } }); }} onDone={onChanged} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!!d?.adFundsTotal && <span className="rounded-full border border-border px-2 py-0.5">Prepaid ad funds: ${d.adFundsTotal.toFixed(2)}</span>}
        <span>{d?.hasAccount ? "Customer account active" : d?.lastInviteAt ? `Invite sent ${ptDate(d.lastInviteAt)}` : "No account yet"}</span>
        {canManage && !d?.hasAccount && <Button size="sm" variant="outline" disabled={inv.isPending} onClick={() => inv.mutate()}>{inv.isPending ? "Sending…" : d?.lastInviteAt ? "Resend invite" : "Send account invite"}</Button>}
      </div>
      {inv.data && <p className="break-all text-xs text-muted-foreground">{inv.data.emailed ? "Emailed. " : ""}Link: {inv.data.link}</p>}
      {inv.error && <p className="text-xs text-destructive">{(inv.error as Error).message}</p>}
      {!!d?.requests.length && (
        <ul className="grid gap-2">
          {d.requests.map(r => (
            <li key={r.id} className="rounded-lg border border-border p-2">
              <p className="whitespace-pre-wrap">{r.message}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{r.author_name} · {ptDate(r.created_at)} · {r.status === "done" ? "Completed" : "Open"}</span>
                {r.status !== "done" && <Button size="sm" variant="outline" disabled={done.isPending} onClick={() => done.mutate(r.id)}>Mark done</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
