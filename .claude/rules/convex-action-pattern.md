# Convex Action Pattern Rule

All external API calls in Convex must follow this exact pattern:
1. validateUrl (SSRF protection) - NEVER skip this step
2. auth check - verify user identity (or allow in dev with AUTH_EMAIL_MOCK=1)
3. rate limit - prevent abuse of expensive operations
4. usage gate - checkAndConsumeUsage for free tier or credit deduction
5. createPending → run work → markComplete/markFailed

This pattern is non-negotiable for all actions that perform external calls (crawling, AI APIs, etc.).

## Why this matters:
- Prevents SSRF vulnerabilities that could access internal services
- Ensures proper authentication and authorization
- Protects against abuse and excessive costs
- Guarantees correct credit consumption tracking
- Maintains consistent audit lifecycle tracking

## Example implementation:
See convex/actions/audit.ts for the canonical implementation.

## Testing requirement:
All new actions must have tests verifying each step of this pattern is followed.