import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deviceType } from "@/lib/visit-format";
import { clientIp, geoForIp } from "@/lib/geo.server";

const Body = z.object({
  page_path: z.string().max(500).default("/"),
  referrer: z.string().max(1000).default(""),
  session_id: z.string().max(100).default(""),
  client_sent_at: z.string().max(40).optional(),
});


export const Route = createFileRoute("/api/public/log-visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = Body.safeParse(await request.json().catch(() => ({})));
          if (!parsed.success) return new Response(null, { status: 400 });
          const b = parsed.data;
          const ip = clientIp(request);
          const ua = (request.headers.get("user-agent") || "").slice(0, 500);
          const sent = b.client_sent_at && !Number.isNaN(Date.parse(b.client_sent_at)) ? new Date(b.client_sent_at).toISOString() : null;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const loc = await geoForIp(ip, supabaseAdmin);
          await supabaseAdmin.from("visitor_logs").insert({
            ip_address: ip, ...loc, page_path: b.page_path || "/", referrer: b.referrer,
            user_agent: ua, device_type: deviceType(ua), session_id: b.session_id, client_sent_at: sent,
          });
          return new Response(null, { status: 204 });
        } catch {
          return new Response(null, { status: 204 });
        }
      },
    },
  },
});
