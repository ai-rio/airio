'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { SiteRow } from './site-row';

type Site = { _id: string; name: string; url: string; monitoringEnabled: boolean };
type Props = { sites: Site[] | undefined };

export function SiteRowsTable({ sites }: Props) {
  if (sites === undefined) {
    return (
      <div className="border border-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 px-8 py-4 border-b border-border last:border-b-0 items-center"
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-border">
      {sites.map((site) => (
        <SiteRow key={site._id} site={site} />
      ))}
    </div>
  );
}
