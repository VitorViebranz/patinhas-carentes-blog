# 0001: Technology stack

Status: accepted
Date: 2026-10-24

## Context

The NGO needs a public site and a staff panel that a non-technical team can maintain.
The host is a Linux server at Univille with limited access. Several infrastructure answers are still pending (section 14 of the build prompt), so defaults were used and are listed below.

## Decision

| Area       | Choice                                                  | Why                                                      |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Runtime    | Node.js LTS, target 24, `engines` accepts `>=22`        | Both receive security fixes in 2026                      |
| Language   | TypeScript strict, ESM                                  | Type safety across API and shared schemas                |
| API        | Fastify 5                                               | Schema validation, built-in Pino, encapsulated plugins   |
| Validation | Zod                                                     | Same schemas shared with the frontend                    |
| Database   | PostgreSQL                                              | Integrity, CHECK constraints, transactions               |
| ORM        | Prisma                                                  | One schema file, built-in migrations, easier DB switch   |
| Auth       | Cookie session (HttpOnly, Secure, SameSite=Lax)         | Same domain behind Nginx, revocable, no token in browser |
| Passwords  | `scrypt` from `node:crypto`                             | No native dependency on a restricted server              |
| Frontend   | React + Vite + TypeScript, React Router, TanStack Query | Already chosen by the team                               |
| Map        | Leaflet with OpenStreetMap tiles                        | Replaces the hand-made SVG map of the prototype          |
| Styling    | CSS Modules and CSS variable tokens                     | No heavy framework, tokens come from the prototype       |
| Tests      | Vitest, Testing Library, `app.inject()`                 | Fast integration tests without opening a port            |
| Quality    | ESLint flat config, Prettier, `tsc --noEmit`            | Same checks locally and in CI                            |
| Monorepo   | npm workspaces                                          | No extra tooling                                         |
| CI         | GitHub Actions                                          | Lint, format, typecheck, test, `npm audit` on every PR   |

## Defaults assumed for pending questions

| Question                   | Default used         |
| -------------------------- | -------------------- |
| Node version on the server | 24 LTS               |
| Database                   | PostgreSQL           |
| Public URL language        | Portuguese           |
| Order retention (LGPD)     | 12 months            |
| Final domain               | Environment variable |

## Phase 0 choices

- No Husky or commitlint yet, to avoid extra dependencies. Conventional Commits are followed by discipline.
- `npm audit` fails only on high or critical severity.
- Latest stable versions were installed on 2026-10-24: TypeScript 6, ESLint 10, Vitest 5, Prettier 3. The build prompt said ESLint 9, but its own rule is to use the latest stable release, and the flat config works the same.
- `moduleResolution: Bundler` in the base tsconfig. The API may move to `NodeNext` in Phase 1 if the runtime setup needs it.

## Consequences

- Dependencies are installed at their latest stable versions on the day of installation, and the lockfile pins them.
- If the Univille server does not allow Node 22 or 24, `engines` and the CI version must change.
- Alternatives considered: Drizzle instead of Prisma (lighter, closer to SQL), Next.js instead of a Vite SPA (revisit in Phase 8 if SEO is not enough).

## Nota: Prisma e config

- Prisma fixado em 7.10.1. A tag `latest` do pacote `prisma` aponta para um RC 8.0, e o `@prisma/client` estável é 7.10.1.
- Arquivo de config se chama `apps/api/prisma7.config.ts` (nome usado pela doc do Prisma 7.10+). Todos os comandos usam `--config prisma7.config.ts`.
- O client gerado fica em `apps/api/src/generated/prisma` (gitignored). Rode `npm run db:generate -w @patinhas/api` após clonar.
