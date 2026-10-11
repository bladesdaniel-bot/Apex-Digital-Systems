import { useEffect, useRef, useState, type FormEvent } from "react";

type Pkg = { name: string; price: string; term: string; custom?: boolean };

export function runCommand(cmd: string, packages: Pkg[]): string[] | "exit" {
  const c = cmd.trim().toLowerCase();
  if (c === "exit") return "exit";
  if (c === "help") return ["Available commands:", "  help      list commands", "  services  list pricing", "  clear     clear screen", "  exit      return to the normal site"];
  if (c === "services") return packages.map(p => `  ${p.name.padEnd(30, ".")} ${p.custom || !p.price ? "custom quote" : `from ${p.price}${p.term}`}`);
  if (c === "") return [];
  return [`command not found: ${c} — type 'help'`];
}

export function TerminalMode({ packages, onExit }: { packages: Pkg[]; onExit: () => void }) {
  const [lines, setLines] = useState<string[]>(["APEX DIGITAL SYSTEMS // TERMINAL v1.0", "Type 'help' to list commands."]);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { end.current?.scrollIntoView(); }, [lines]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === "clear") { setLines([]); setValue(""); return; }
    const out = runCommand(value, packages);
    if (out === "exit") return onExit();
    setLines(l => [...l, `apex@reno:~$ ${value}`, ...out]);
    setValue("");
  };

  return (
    <div className="terminal-screen fixed inset-0 z-[100] overflow-y-auto p-6 font-technical text-sm leading-7 sm:p-10" onClick={() => input.current?.focus()}>
      {lines.map((l, i) => <pre key={i} className="whitespace-pre-wrap">{l}</pre>)}
      <form onSubmit={submit} className="flex gap-2">
        <span>apex@reno:~$</span>
        <input ref={input} value={value} onChange={e => setValue(e.target.value)} aria-label="Terminal command" className="flex-1 bg-transparent caret-current outline-none" autoComplete="off" spellCheck={false} />
      </form>
      <div ref={end} />
    </div>
  );
}
