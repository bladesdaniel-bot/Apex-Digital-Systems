// Browser-safe helpers for the ElevenLabs `fill_order_form` client tool.
export type FillOrderParams = Partial<Record<
  "business_name" | "your_name" | "email" | "phone" | "website_url" | "business_type" | "city" | "services" | "budget" | "timeline" | "details",
  unknown
>>;

const FIELD_MAP: Record<string, string> = {
  business_name: "business", your_name: "name", email: "email", phone: "phone",
  website_url: "website", business_type: "industry", city: "location", details: "details",
};

const norm = (s: string) => s.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9$+&-]+/g, " ").trim();

export function parseServices(value: string, options: readonly string[]): string[] {
  const wanted = value.split(",").map(norm).filter(Boolean);
  return options.filter(o => wanted.includes(norm(o)));
}

export function matchOption(value: string, options: readonly string[]): string | undefined {
  const v = norm(value);
  return options.find(o => norm(o) === v) ?? options.find(o => norm(o).includes(v) || v.includes(norm(o)));
}

function flash(el: HTMLElement) {
  el.classList.remove("voice-filled");
  void el.offsetWidth;
  el.classList.add("voice-filled");
  window.setTimeout(() => el.classList.remove("voice-filled"), 1600);
}

let scrolled = false;

/** Merge only non-empty incoming values into the form; never clears existing input. */
export function fillOrderForm(params: FillOrderParams): string {
  const form = document.querySelector<HTMLFormElement>("#analysis form");
  const section = document.getElementById("analysis");
  if (!scrolled && section) { scrolled = true; section.scrollIntoView({ behavior: "smooth", block: "start" }); }
  if (!form) return "Form updated successfully";
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

  for (const [key, name] of Object.entries(FIELD_MAP)) {
    const val = str(params[key as keyof FillOrderParams]);
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!val || !el || el.value === val) continue;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    setter ? setter.call(el, val) : (el.value = val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    flash(el);
  }

  for (const name of ["budget", "timeline"] as const) {
    const val = str(params[name]);
    const sel = form.elements.namedItem(name) as HTMLSelectElement | null;
    if (!val || !sel) continue;
    const opts = Array.from(sel.options).map(o => o.value).filter(Boolean);
    const m = matchOption(val, opts);
    if (m && sel.value !== m) { sel.value = m; sel.dispatchEvent(new Event("change", { bubbles: true })); flash(sel); }
  }

  const services = str(params.services);
  if (services) {
    const boxes = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="interests"]'));
    const picks = parseServices(services, boxes.map(b => b.value));
    for (const b of boxes) if (picks.includes(b.value) && !b.checked) {
      b.checked = true;
      b.dispatchEvent(new Event("change", { bubbles: true }));
      flash(b.closest("label") ?? b);
    }
  }
  return "Form updated successfully";
}
