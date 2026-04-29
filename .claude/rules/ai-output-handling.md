# AI Output Handling Rule

Treat AI-generated content as untrusted input. All outputs from AI services (e.g., Anthropic Claude via aeoAnalyzer) must be validated and sanitized before use.

## Requirements:
1. **Validation**: Check that AI outputs conform to expected schemas and formats.
   - For JSON outputs, validate structure and data types.
   - For text outputs (e.g., llms.txt, robots.txt patches), ensure they adhere to specifications.
2. **Sanitization**: Remove or escape any potentially harmful content (e.g., scripts, HTML) before storing or displaying.
3. **Safe Storage**: Store AI outputs as raw data (e.g., in a JSON field or text file) but never interpret or execute them without validation.
4. **Prompt Management**: Regularly review and test AI prompts for effectiveness, safety, and bias. Version prompts and log which version was used for each audit.
5. **Fallbacks**: Implement fallback mechanisms for when AI services fail, return invalid data, or produce unsafe outputs.
6. **Logging**: Log AI usage (tokens, cost, model) and any validation/sanitization actions taken for auditing and debugging.

## Why this matters:
- Prevents injection attacks (XSS, etc.) from malicious or malformed AI outputs.
- Ensures the integrity and reliability of generated fixes and reports.
- Helps manage costs and quality of AI services.
- Provides traceability for compliance and debugging.

## Implementation Examples:
See `lib/aeoAnalyzer.ts` for how AI outputs are structured and used.
In the dashboard, ensure that any display of AI-generated content is properly escaped (e.g., using React's automatic escaping or sanitization libraries).