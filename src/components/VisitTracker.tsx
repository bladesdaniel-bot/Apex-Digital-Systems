import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { EXCLUDE_KEY, shouldSkipTracking } from "@/components/ViewCounter";

const SESSION_KEY = "apex_visit_session";

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return ""; }
}

/** Only team/admin accounts can sign in, so any signed-in device is permanently excluded from visitor tracking. */
function excludeThisDevice() {
  try { localStorage.setItem(EXCLUDE_KEY, "true"); } catch { /* storage unavailable */ }
}

/** Logs each page load / route change in the background; never blocks or throws. Skips team devices. */
export function VisitTracker() {
  const path = useRouterState({ select: s => s.location.pathname });
  const first = useRef(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (session) excludeThisDevice(); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (path.startsWith("/lovable")) return;
    const referrer = first.current ? document.referrer : window.location.origin + "(internal)";
    first.current = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) { excludeThisDevice(); return; }
        if (shouldSkipTracking(window.location.search, window.localStorage)) return;
        await fetch("/api/public/log-visit", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_path: path, referrer, session_id: sessionId(), client_sent_at: new Date().toISOString() }),
        });
      } catch { /* ignore */ }
    })();
  }, [path]);
  return null;
}
