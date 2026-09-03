# SOP TA — React Frontend Rules

## Stack

- React 19+
- Vite 7+
- TypeScript 5.9+ strict mode
- TanStack Router
- TanStack Query
- Orval for OpenAPI-generated client/hooks
- Tailwind CSS v4+
- pnpm
- Axios through one centralized API client

## Core principles

- Functional, declarative React components.
- Strict typing; do not use `any` when a concrete or narrowed `unknown` type is possible.
- Prefer immutable state and functional updates.
- Keep components cohesive; split by responsibility, not file-count goals.
- Use semantic HTML, visible focus, keyboard-accessible interactions, and accessible names.
- Prefer reuse of existing project primitives/patterns before adding libraries or abstractions.
- Do not add decorative framework or architecture changes unrelated to the requested behavior.

## React

- Do not use `useEffect` for ordinary data fetching; use TanStack Query/Orval-owned data flow.
- Prefer composition over prop-drilling abstractions.
- Use optimistic UI only when the product behavior benefits and rollback/error behavior is defined.
- Use `useMemo`/`useCallback` only when referential stability or measured computation cost requires it.

## Routing and API

- Use TanStack Router's typed route APIs and validated search params.
- Prefer generated Orval clients/hooks when the OpenAPI contract owns the endpoint.
- Keep one centralized Axios instance for auth/interceptors.
- Handle `401`/refresh behavior centrally rather than per component.
- Runtime response validation is justified when the backend contract is not sufficiently trustworthy or when the boundary is security/data critical.

## Styling

- Use Tailwind CSS v4 tokens/utilities and the existing design language.
- Mobile-first responsive layout.
- Avoid `@apply` unless the repository already owns a justified shared CSS abstraction.
- Avoid arbitrary gradients, glow, excessive pills/cards, or decorative UI that does not serve hierarchy or interaction.

## Testing and verification

Use risk-proportional automated evidence only:

- Vitest for deterministic logic/hooks/state behavior.
- React Testing Library for meaningful component interaction, accessibility semantics, and regressions.
- Typecheck/lint/build for static and integration confidence.
- Add tests where a realistic regression exists; do not require a spec file merely because a feature is labelled critical.
- TDD is optional when a failing deterministic test is the cheapest way to define the behavior; it is not mandatory ceremony for every function/component.

**Do not require Playwright/browser E2E, black-box testing, manual acceptance testing, or manual visual review as merge/release gates.** If a browser-only behavior cannot be reproduced deterministically, document residual risk rather than introducing a human acceptance step.

## API response contract

All API responses use the project envelope:

```json
{
  "message": "string",
  "success": true,
  "data": {}
}
```

Large/list payloads include pagination metadata inside `data`.

## Security

- Never expose secrets/private keys in frontend source or client-visible environment variables.
- Do not use `dangerouslySetInnerHTML` unless content is explicitly sanitized and the requirement justifies it.
- Prefer HttpOnly cookie-based auth when supported by the approved backend contract; otherwise preserve the existing authorized token design and mitigate XSS risk.
- Treat permission/authentication changes as material security-boundary changes.

## Folder ownership

Prefer current repository structure. Shared UI primitives belong in the shared UI owner only when reused by multiple current features. Domain-specific behavior stays with its domain. Do not create generic `utils`, wrapper components, or state containers without a concrete current need.

## Change discipline

Implement the smallest coherent authorized change. Avoid unrelated refactors, speculative future-proofing, dependency churn, and product/architecture expansion not requested by the user.
