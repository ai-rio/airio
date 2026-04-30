'use client';

import { PsosChangeBadge } from '@/components/psos-change-badge';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

function scoreColorClass(score: number) {
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

type SiteRowProps = {
  site: { _id: string; name: string; url: string; monitoringEnabled: boolean };
};

export function SiteRow({ site }: SiteRowProps) {
  const latestAudit = useQuery(api.audits.latestBySite, {
    siteId: site._id as Id<'sites'>,
  });
  const latestReport = useQuery(api.visibilityReports.latestBySite, {
    siteId: site._id as Id<'sites'>,
  });
  const reports = useQuery(api.visibilityReports.listBySite, {
    siteId: site._id as Id<'sites'>,
    limit: 5,
  });

  // Parse critical findings from latest audit outputFiles
  let critCount = 0;
  if (latestAudit?.outputFiles) {
    try {
      const parsed = JSON.parse(latestAudit.outputFiles) as {
        findings?: Array<{ severity: string }>;
      };
      critCount = (parsed.findings ?? []).filter((f) => f.severity === 'critical').length;
    } catch {
      // ignore parse errors
    }
  }

  // Build sparkline data from reports
  const sparkData =
    reports
      ?.slice()
      .reverse()
      .map((r: { psos: number }, i: number) => ({ i, v: r.psos })) ?? [];

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 px-8 py-4 border-b border-border last:border-b-0 hover:bg-muted/50 items-center">
      {/* Name + URL */}
      <div>
        <div className="font-sans font-medium text-foreground">{site.name}</div>
        <div className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
          {site.url}
        </div>
      </div>

      {/* AEO score */}
      <div className="min-w-[2rem] text-right">
        {latestAudit === undefined ? (
          <span className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-muted-foreground">
            —
          </span>
        ) : latestAudit === null || latestAudit.score === null ? (
          <span className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-muted-foreground">
            —
          </span>
        ) : (
          <span
            className={`font-[family-name:var(--font-bebas)] text-[32px] leading-none ${scoreColorClass(latestAudit.score)}`}
          >
            {latestAudit.score}
          </span>
        )}
      </div>

      {/* PSOS + sparkline */}
      <div className="flex items-center gap-2">
        {!site.monitoringEnabled || latestReport === undefined || latestReport === null ? (
          <span className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-muted-foreground">
            —
          </span>
        ) : (
          <>
            <span className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-foreground">
              {pct(latestReport.psos)}
            </span>
            <PsosChangeBadge
              currentPsos={latestReport.psos}
              previousPsos={reports?.[1]?.psos ?? null}
            />
            {sparkData.length >= 2 && (
              <div style={{ width: 64 }}>
                <ResponsiveContainer width="100%" height={32}>
                  <AreaChart data={sparkData}>
                    <Area
                      dataKey="v"
                      stroke="var(--brand-text)"
                      fill="var(--surface-yellow)"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Tooltip contentStyle={{ display: 'none' }} cursor={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Alert badge */}
      <div className="min-w-[1rem]">
        {critCount > 0 && (
          <span className="font-[family-name:var(--font-mono)] text-[10px] px-1.5 bg-[var(--brand-danger)] text-[var(--brand-fg)]">
            {critCount}
          </span>
        )}
      </div>

      {/* Manage link */}
      <Link
        href={`/sites/${site._id}`}
        className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:opacity-80 whitespace-nowrap"
      >
        GERENCIAR →
      </Link>
    </div>
  );
}
