# Testing Environment Setup

This project follows the stack documented in `./.ai/tech-stack.md` (Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui) and applies the testing guidelines in `.cursor/rules/vitest-unit-testing-rules.mdc` for unit/integration work and `.cursor/rules/playwright-testing-rules.mdc` for E2E flows.

## Unit tests with Vitest

- `vitest.config.ts` sets `environment: 'jsdom'`, `globals: true`, and a shared setup file so that DOM utilities (`@testing-library/jest-dom`) and future global mocks reuse a single entry point.
- Tests live under `src/**/*.test.{ts,tsx}` or `tests/unit/**` and run with watchers (`npm run test:watch`) or UI mode (`npm run test:ui`). Use `vi` helpers inside tests (`vi.fn`, `vi.mock`, `vi.spyOn`, `vi.stubGlobal`) as the rule set suggests, and prefer inline snapshots (`expect().toMatchInlineSnapshot()`) when asserting rendered output.
- Coverage is collected via `c8` (text + HTML), and the configuration keeps Supabase/API mocks outside the scope by excluding `dist`, `node_modules`, and `tests/e2e`.
- Follow the arrange-act-assert structure, keep happy paths last, and guard invalid inputs early. Place reusable mock factories at the top level of each spec so `vi.mock()` can run before imports.

## End-to-end tests with Playwright

- The Playwright config restricts runs to Chromium/Chrome channels, uses browser contexts automatically, and enables parallel execution (`fullyParallel: true`) plus tracing, video, and screenshot capture for debugging per the rule file.
- Place E2E specs in `tests/e2e`. Follow the Page Object Model for reusable flows, rely on locators, and add API-level helpers when backend validation is required (`use.locator` + `expect`). Use `expect(page).toHaveScreenshot()` for visual regression when needed.
- Use hooks (`test.beforeEach`, `test.afterEach`) to manage setup/teardown, keep tests isolated in their own contexts, and leverage the Playwright trace viewer when a retry fails.
- Run `npm run test:e2e` for headless batches and `npm run test:e2e:headed` during local debugging. Use `npm run test:e2e:codegen` when crafting new flows.

## Getting started with the environment

1. Ensure Node.js 22.14.0 (matching `.nvmrc`) and npm are installed.
2. Install dependencies: `npm install`.
3. Copy `.env.example` (when provided) and add Supabase/Openrouter.ai credentials.
4. Execute `npm run test` for a single Vitest pass or `npm run test:e2e` for the full Playwright suite.

## IDE/CI recommendations

- Configure your editor to run Vitest via `npm run test:watch` for instant feedback and `npm run test:ui` for visual navigation when suites grow.
- In CI (GitHub Actions), run `npm run lint`, `npm run test`, and `npm run test:e2e` for each feature branch to satisfy the plan in `.ai/test-plan.md`.
- Use Playwright parallel execution wisely and inspect artifacts under `tests/e2e/test-results` after failures.

