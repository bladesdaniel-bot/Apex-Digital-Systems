import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const EXCLUDE_KEY = "apex_exclude_tracking";
const SESSION_KEY = "apex_view_counted";

export function shouldSkipTracking(search: string, storage: Pick<Storage, "getItem" | "setItem">): boolean {
  if (new URLSearchParams(search).get("exclude_tracking") === "true") {
    storage.setItem(EXCLUDE_KEY, "true");
  }
  return storage.getItem(EXCLUDE_KEY) === "true";
}

export function trackFormSubmission(
  search: string,
  storage: Pick<Storage, "getItem" | "setItem">,
  increment: () => void,
): void {
  if (!shouldSkipTracking(search, storage)) increment();
}

export function ViewCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const skip = shouldSkipTracking(window.location.search, window.localStorage);
      if (!skip && !sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        const { data, error } = await supabase.rpc("increment_site_views");
        if (!error && typeof data === "number") {
          if (!cancelled) setCount(data);
          return;
        }
      }
      const { data } = await supabase.from("site_views").select("total").eq("id", 1).maybeSingle();
      if (!cancelled && data) setCount(Number(data.total));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Total page views">
      <Eye className="h-3.5 w-3.5" />
      {count === null ? "—" : count.toLocaleString()} views
    </span>
  );
}
