# Angular Skills — Best-Practices Assessment Prompt

Assess this Angular application against current Angular best practices.

Review the project as a senior Angular engineer. Do not make code changes yet.

Evaluate:

1. Angular architecture
- Module/standalone structure
- Routing and lazy loading
- Component boundaries
- Shared/core organization
- Service responsibilities
- Dependency injection usage

2. Modern Angular usage
- Signals where appropriate
- Control flow syntax
- Deferrable views
- Typed forms
- DestroyRef / takeUntilDestroyed
- Standalone components, if migration makes sense
- Avoiding outdated patterns

3. RxJS and state
- Subscription cleanup
- Overuse of Subjects
- Unnecessary manual subscriptions
- Memory leaks
- Data flow clarity
- Caching and sync behavior

4. Performance
- Change detection issues
- Large bundle contributors
- Lazy loading opportunities
- Expensive template logic
- Excessive re-rendering
- TrackBy usage
- Service worker/PWA setup

5. Forms and validation
- Typed reactive forms
- Validation consistency
- Error display
- Reusable form patterns

6. Testing
- Unit test quality
- Missing coverage
- Brittle tests
- Suggested high-value tests

7. Maintainability
- Dead code
- Duplicated logic
- Oversized components/services
- Poor naming
- Over-engineering
- Inconsistent patterns

8. Security
- Auth flow
- Route guards
- User input handling
- Environment config
- Exposed secrets or unsafe assumptions

Deliver a report with:
- Overall health rating
- Top 10 issues
- Quick wins
- Larger refactors
- Things that are already done well
- Recommended migration path, if applicable

Use this app’s context:
Angular app hosted on Netlify, Supabase auth/cloud sync, localStorage guest mode, Excel import parsing, PDF export, localization, and workout tracking.

Do not recommend changes just because they are trendy. Recommend them only if they improve correctness, performance, maintainability, or user experience.
