import { cronJobs } from 'convex/server'
import { anyApi } from 'convex/server'

const crons = cronJobs()

crons.interval(
  'run due site audits',
  { hours: 1 },
  anyApi.actions.monitoring.runDueSiteAudits,
  {}
)

export default crons
