# Site - Airio Marketing Landing Page (ai.rio.br)

This is the Next.js 15 application for the Airio marketing landing page, accessible at ai.rio.br.

## Purpose
- Present Airio's value proposition: AI-powered SEO audits for AI search visibility
- Explain features: AEO analysis, robots.txt/llms.txt fixes, credit packs
- Show pricing and call-to-action for signing up
- Provide documentation and blog content (via fumadocs)
- Capture user interest and redirect to dashboard app for registration/audit

## Commands
```bash
# Development
bun run dev          # Runs on http://localhost:3003

# Production build
bun run build

# Start production server
bun run start        # Runs on http://localhost:3003

# Linting
bun run lint
```

## Tech Stack
- Next.js 15 (App Router)
- Tailwind 4 for styling
- Fumadocs (core, mdx, ui) for documentation and blog
- Lucide React for icons
- Zod for schema validation (used in forms)
- React 19 and React DOM

## Key Flows

### Visitor Flow
1. User lands on homepage (`/`) → sees hero section with value proposition and CTA
2. Scrolling down → feature sections explain audit process, AI analysis, fix generation
3. Pricing section → shows free tier (1 audit/month) and paid packs (10/30/100 audits)
4. Testimonials/social proof → builds trust
5. Final CTA → button links to dashboard sign-up (`https://seo.ai.rio.br/sign-in`)

### Documentation Flow
1. User navigates to `/docs` → sees documentation index
2. Clicking a doc → shows MDX-rendered content with sidebar navigation
3. Search functionality → filters docs in real-time

### Blog Flow
1. User navigates to `/blog` → sees list of blog posts
2. Clicking a post → shows full article with reading time, tags
3. Pagination → browses older posts

### Conversion Flow
1. User clicks "Get Started" or "Try Free Audit" → redirects to dashboard sign-up
2. If user has an existing session, may be redirected directly to dashboard
3. No authentication is handled on the site; all user management occurs in the dashboard app

## Site-Specific Guidelines

### Content and SEO
- Use semantic HTML5 elements for better accessibility and SEO
- Ensure all images have descriptive alt text
- Implement proper heading hierarchy (H1 only once per page)
- Add structured data (JSON-LD) for organization and potentially FAQ schema
- Optimize meta tags (title, description) for each route; they are already set in layout.tsx and page.tsx
- Use next/font for optimized font loading (already configured in globals.css via Tailwind)

### Performance
- Leverage Next.js automatic code splitting and route-based prefetching
- Optimize images using next/image (when implemented) or ensure proper dimensions
- Minimize client-side JavaScript; favor static generation where possible
- Use Tailwind 4's built-in purging to keep CSS minimal
- Audit with Lighthouse regularly to maintain high performance scores

### UI/UX
- Follow the existing design system visible in components (though site may have fewer reusable components)
- Use Tailwind 4 utility classes consistently; avoid arbitrary values when possible
- Maintain consistent spacing (using Tailwind's spacing scale)
- Ensure responsive design works on mobile, tablet, and desktop
- Keep interactions intuitive; avoid over-engineering animations
- Accessibility: ensure sufficient color contrast, focus outlines, and ARIA labels where needed

### Documentation and Blog (Fumadocs)
- Keep MDX content well-formatted with proper frontmatter (title, date, description, etc.)
- Use fumadocs-ui components for consistent presentation (tabs, callouts, etc.)
- Ensure all links work and are not broken
- For blog, maintain a consistent publishing schedule and tagging strategy

### Forms and Interactions
- Any forms (e.g., newsletter signup if added) should use Zod for validation
- Show loading states during submissions
- Provide clear success and error messages
- Prevent double submissions

### Routing
- Use Next.js 15 App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` as needed
- Keep route segments predictable and lowercase
- Use `generateStaticParams` for dynamic routes if applicable (e.g., blog/[slug])
- Handle 404 gracefully with a custom page

### Internationalization
- Currently the site is in Portuguese (pt-BR). If expanding to other languages, consider using next-i18next or similar.
- Keep all UI strings in JSON files for easy translation if needed in the future.

## Rule Files
For detailed, domain-specific rules, see the files in `../.claude/rules/`:
- `../.claude/rules/convex-action-pattern.md` - Convex action pattern requirements
- `../.claude/rules/ai-output-handling.md` - Handling AI-generated content safely
- `../.claude/rules/credit-billing-integrity.md` - Credit and billing accuracy requirements
- `../.claude/rules/seo-aeo-validation.md` - Validating SEO/AEO outputs
- `../.claude/rules/observability.md` - Logging, monitoring, and alerting requirements

You need to mention the location of these files in claude.md so Claude knows they exist. For example, if you want Claude to follow certain specific instructions when writing APIs, you can add those in a rule file for them so that when Claude is working on them, it can load those instructions and use them directly.

### Maintenance
Keep this file focused on site-specific guidance. Refer to the root CLAUDE.md for cross-cutting hard rules (Think before coding, Simplicity first, etc.). Update this file as the site evolves.