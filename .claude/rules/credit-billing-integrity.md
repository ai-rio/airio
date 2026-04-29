# Credit & Billing Integrity Rule

Never compromise credit accounting. Every audit must deduct exactly the correct credits (0 for free tier, 1+ for paid). Implement idempotent credit deduction to prevent double-charging. Always verify credit balance before allowing audit creation. Log all credit transactions with sufficient detail for audit trails. Test edge cases: zero credits, exactly enough credits, credit expiration.

## Requirements:
1. **Exact Deduction**: Ensure that the number of credits deducted matches the audit's billed amount (free tier: 0, paid: pack size or per-audit cost).
2. **Idempotency**: Design credit deduction operations to be idempotent so that retries do not cause over-deduction.
3. **Pre-Check**: Always verify that the user has sufficient credits (or is within free tier limits) before starting an audit.
4. **Audit Trail**: Log every credit transaction with user ID, audit ID, amount, timestamp, and reason (e.g., "audit completion", "pack purchase").
5. **Edge Case Testing**: Write tests for scenarios such as:
   - User with zero credits attempting to start an audit.
   - User with exactly enough credits for one audit.
   - Credit pack expiration and renewal.
   - Concurrent audit requests to ensure no race conditions.

## Why this matters:
- Prevents revenue leakage or customer distrust due to incorrect billing.
- Ensures compliance with financial expectations and audit requirements.
- Maintains trust in the platform's economic model.

## Implementation Examples:
See `users.ts:checkAndConsumeUsage` for how credit gating is performed.
In `actions/audit.ts`, note how `billedAs` is determined and how the audit is marked as complete only after successful processing.