import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'run due site audits',
  { hours: 1 },
  internal.actions.monitoring.runDueSiteAudits,
  {}
);

export default crons;
