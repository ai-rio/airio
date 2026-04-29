'use client';

import { GLOSSARY, type GlossaryTerm } from '@/lib/glossary';

interface InfoTooltipProps {
  term: GlossaryTerm;
}

export function InfoTooltip({ term }: InfoTooltipProps) {
  return (
    <span className="relative inline-block group ml-1 align-middle">
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 border border-muted-foreground text-muted-foreground font-[family-name:var(--font-mono)] text-[9px] cursor-help leading-none"
        aria-label={`O que é ${term}`}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-card border border-border px-3 py-2 font-sans text-[12px] text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-50"
      >
        <strong className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-text)]">
          {term}
        </strong>
        <br />
        {GLOSSARY[term]}
      </span>
    </span>
  );
}
