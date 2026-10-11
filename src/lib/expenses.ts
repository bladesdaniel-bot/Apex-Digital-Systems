// Browser-safe expense helpers shared by the Expenses page, server functions and tests.
export const EXPENSE_CATEGORIES = [
  "Software & Subscriptions",
  "Hosting & Infrastructure",
  "AI & API Usage",
  "Domains",
  "Equipment & Hardware",
  "Office Supplies",
  "Advertising & Marketing",
  "Contractors & Freelancers",
  "Licenses & Fees",
  "Professional Services",
  "Travel & Meals",
  "Other",
] as const;

export type Expense = {
  id: string; expense_date: string; vendor: string; amount: number;
  allocation: "general" | "project"; project: string; category: string;
  description: string; receipt_path: string; created_at: string; receipt_url?: string;
};

export const GENERAL_LABEL = "General company";

/** Totals in cents: everything, general company, all projects, and per-project spend (largest first). */
export function summarizeExpenses(rows: Pick<Expense, "amount" | "allocation" | "project">[]) {
  let total = 0, general = 0, projects = 0;
  const byProject = new Map<string, number>();
  for (const r of rows) {
    const c = Math.round(Number(r.amount) * 100) || 0;
    total += c;
    if (r.allocation === "project") {
      projects += c;
      const name = r.project.trim() || "Unnamed project";
      byProject.set(name, (byProject.get(name) ?? 0) + c);
    } else general += c;
  }
  return { total, general, projects, perProject: [...byProject.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents) };
}

const csvCell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function expensesCsv(rows: Expense[]) {
  const head = ["Date", "Vendor", "Amount", "Allocation", "Project", "Category", "Description"];
  const lines = rows.map(r => [r.expense_date, r.vendor, Number(r.amount).toFixed(2), r.allocation === "project" ? "Project" : GENERAL_LABEL, r.project, r.category, r.description].map(csvCell).join(","));
  return [head.join(","), ...lines].join("\n");
}
