import type { ReactNode } from "react";

/** Renders inline **bold** and *italic* spans. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={`${keyPrefix}-${i}`}>{p.slice(1, -1)}</em>;
    return <span key={`${keyPrefix}-${i}`}>{p}</span>;
  });
}

/** Minimal markdown renderer for AI briefs: ## headings, **bold**, - bullets, paragraphs. */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="ml-5 list-disc space-y-1">
        {list.map((item, i) => <li key={i}>{inline(item, `${key}-${i}`)}</li>)}
      </ul>,
    );
    list = [];
  };
  text.split(/\n{2,}/).forEach((block, bi) => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    const nonList = lines.filter(l => !l.startsWith("- ") && !l.startsWith("* "));
    if (lines.length > 1 && nonList.length === 0) {
      lines.forEach((l, li) => list.push(l.slice(2)));
      if (bi === text.split(/\n{2,}/).length - 1) flushList(`list-${bi}`);
      return;
    }
    flushList(`list-pre-${bi}`);
    lines.forEach((line, li) => {
      const key = `b${bi}-l${li}`;
      if (line.startsWith("### ")) blocks.push(<h4 key={key} className="mt-4 font-medium text-aetheris-teal first:mt-0">{inline(line.slice(4), key)}</h4>);
      else if (line.startsWith("## ")) blocks.push(<h3 key={key} className="mt-5 font-display text-base font-medium text-foreground first:mt-0">{inline(line.slice(3), key)}</h3>);
      else if (line.startsWith("# ")) blocks.push(<h3 key={key} className="mt-5 font-display text-lg font-medium text-foreground first:mt-0">{inline(line.slice(2), key)}</h3>);
      else if (line.startsWith("- ") || line.startsWith("* ")) list.push(line.slice(2));
      else blocks.push(<p key={key} className="mt-2 first:mt-0">{inline(line, key)}</p>);
    });
    flushList(`list-post-${bi}`);
  });
  return <div className={className}>{blocks}</div>;
}
