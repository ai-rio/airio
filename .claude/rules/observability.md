# Observability Requirements Rule

Always include sufficient logging and monitoring for key operations and errors.

## Requirements:
1. **Structured Logging**: Use structured logging (e.g., JSON logs) for key events such as:
   - Audit start, completion, and failure.
   - External API calls (crawling, AI services, payment webhooks).
   - Authentication events (login, logout, token refresh).
   - Credit transactions (deduction, purchase, refund).
   - Errors and exceptions (with stack traces in development, error codes in production).
2. **Performance Metrics**: Track and monitor:
   - Crawl time (time to fetch robots.txt, llms.txt, HTML).
   - AI service latency and token usage.
   - Database query latency (especially for frequent queries).
   - End-to-end audit latency.
3. **Alerting**: Set up alerts for:
   - Error rates exceeding thresholds (e.g., 5% of audits failing).
   - Performance degradation (e.g., crawl time doubling).
   - Credit purchase failures or webhook issues.
   - Authentication anomalies (e.g., many failed login attempts).
4. **Correlation IDs**: Generate and propagate a unique correlation ID for each audit request to trace it across services (Convex actions, external APIs, etc.).
5. **Audit Trails**: Log user actions (especially administrative or billing-related) for compliance and debugging.
6. **Monitoring Dashboards**: Maintain dashboards (e.g., in Convex dashboard or external tools) that show:
   - Audit throughput and success rate.
   - Credit usage and revenue.
   - User activity and growth.
   - System health (memory, CPU, etc., if applicable).
7. **Log Retention and Privacy**: Ensure logs are retained for an appropriate period and that personally identifiable information (PII) is not logged unnecessarily (or is redacted).

## Why this matters:
- Enables rapid detection and diagnosis of issues.
- Helps in understanding usage patterns and performance bottlenecks.
- Provides evidence for audits and compliance.
- Supports data-driven decisions for improvements and scaling.

## Implementation Examples:
- In Convex actions, use `console.log` with structured objects (or a logging helper) at key steps.
- In the dashboard and site apps, consider using logging services or console.log for debugging (but be mindful of production output).
- For metrics, consider integrating with a monitoring service (e.g., via environment-specific configuration) or using custom counters in Convex (e.g., a metrics table).
- For alerting, set up monitors in your deployment platform (e.g., Vercel, Netlify, or custom) or use Convex's scheduled functions to check metrics and trigger notifications.