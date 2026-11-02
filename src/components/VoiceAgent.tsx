import { useEffect, useState } from "react";
import { fillOrderForm, type FillOrderParams } from "@/lib/voice-form";
import { getVoiceAgentEnabled } from "@/lib/voice-agent.functions";

// Public agent ID (not a secret); env var can override.
const AGENT_ID = (import.meta.env['VITE_ELEVENLABS_AGENT_ID'] as string | undefined) ?? "agent_4301m58tqs25f06rwr9ghvz886kg";

/** Mounts the ElevenLabs widget (only when the owner has it switched on) and registers `fill_order_form`. */
export function VoiceAgent() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    getVoiceAgentEnabled().then(r => { if (alive) setEnabled(r.enabled); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !AGENT_ID) return;
    const tools = { fill_order_form: (p: FillOrderParams) => fillOrderForm(p ?? {}) };
    (window as unknown as { apexClientTools?: typeof tools }).apexClientTools = tools;
    const onCall = (e: Event) => {
      const detail = (e as CustomEvent).detail as { config?: { clientTools?: Record<string, unknown> } } | undefined;
      if (detail?.config) detail.config.clientTools = { ...(detail.config.clientTools ?? {}), ...tools };
    };
    document.addEventListener("elevenlabs-convai:call", onCall, true);
    if (!document.querySelector("script[data-elevenlabs-widget]")) {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      s.async = true; s.type = "text/javascript"; s.dataset['elevenlabsWidget'] = "1";
      document.body.appendChild(s);
    }
    let w = document.querySelector("elevenlabs-convai");
    if (!w) {
      w = document.createElement("elevenlabs-convai");
      w.setAttribute("agent-id", AGENT_ID);
      document.body.appendChild(w);
    }
    return () => {
      document.removeEventListener("elevenlabs-convai:call", onCall, true);
      document.querySelector("elevenlabs-convai")?.remove();
    };
  }, [enabled]);
  return null;
}
