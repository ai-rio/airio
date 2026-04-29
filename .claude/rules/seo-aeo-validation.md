# SEO/AEO Specific Validation Rule

Validate SEO-related outputs to ensure they are correct and safe.

## Requirements:
1. **llms.txt Validation**: Generated `llms.txt` must follow the llms.txt specification (https://llms.txt/). Validate format, allowed directives, and syntax.
2. **robots.txt Validation**: `robots.txt` patches must be valid robots.txt syntax. Check for correct use of User-agent, Disallow, Allow, Crawl-delay, Sitemap, etc. Ensure patches do not inadvertently block important resources or create contradictions.
3. **HTML Fixes Validation**: Any HTML changes suggested by the AI must be validated to ensure they do not break existing functionality. This includes checking for valid HTML, ensuring no required attributes are removed, and that changes are semantically appropriate.
4. **Security Scanning**: All generated files (llms.txt, robots.txt patches, HTML fixes) must be scanned for common vulnerabilities (e.g., XSS in HTML, path traversal in file references).
5. **CMS Compatibility**: Test generated fixes against common CMS platforms (WordPress, Shopify, etc.) to ensure they apply correctly and do not break platform-specific features.
6. **Change Impact Analysis**: Before applying any fix, analyze the potential impact on SEO rankings and user experience. Prefer non-invasive changes when possible.
7. **Versioning**: Keep track of which version of the AI prompt generated each fix to enable rollback if needed.

## Why this matters:
- Incorrect SEO files can harm a site's search visibility.
- Malicious or malformed AI outputs could introduce security vulnerabilities.
- Ensuring compatibility with various platforms increases the reliability of the service.
- Proper validation maintains trust in the AI-generated recommendations.

## Implementation Examples:
See `lib/aeoAnalyzer.ts` for how the AI output is structured.
In the audit completion flow, before storing or presenting the outputFiles, run validation checks.
Consider creating a validation library in `lib/seoValidator.js` that can be used by actions and the dashboard.