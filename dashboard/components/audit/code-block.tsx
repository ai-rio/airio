'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="p-4 text-xs bg-muted text-[var(--brand-text)] overflow-x-auto whitespace-pre-wrap leading-relaxed pr-16">
        {code}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-3 right-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-1 border border-border bg-background text-muted-foreground hover:text-foreground hover:border-[var(--brand)] transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}
