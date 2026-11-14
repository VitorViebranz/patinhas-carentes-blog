# 0004: Docker and deployment

Status: accepted
Date: 2026-10-26

## Context

The build prompt made Docker optional, because the Univille server may not offer it. The team asked
for Docker anyway, which also gives everybody the same PostgreSQL and a repeatable deploy. The host
based setup (nginx plus systemd) stays documented as a fallback.

## Decisions

| Area          | Choice                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Images        | One for the API (`apps/api/Dockerfile`) and one for the site (`apps/web/Dockerfile`)                                                   |
| Build context | Repository root, because the apps share `packages/shared` and the lockfile                                                             |
| API runtime   | `node --import tsx src/server.ts`. The API has no compile step and its imports have no extension, so tsx stays as a runtime dependency |
| Migrations    | `docker-entrypoint.sh` runs `prisma migrate deploy` before the server starts (`RUN_MIGRATIONS=false` skips it)                         |
| Site runtime  | Static files behind `nginxinc/nginx-unprivileged`, which also proxies `/api` to the API                                                |
| Database      | `postgres:16-alpine` with a named volume. Not published on the host in production                                                      |
| Uploads       | Named volume mounted at `/data/uploads`                                                                                                |
| Users         | Both containers run as non root. nginx listens on 8080                                                                                 |
| TLS           | Terminated in front of the stack. The API sees `X-Forwarded-Proto`                                                                     |
| Config        | The API container receives the whole `.env` (`env_file`). `environment` in the compose file overrides what the container must control  |
| Ports         | Site on `WEB_PORT` (all interfaces) and API on `127.0.0.1:API_PORT`, both read from `.env` with defaults                               |
| Cookie flag   | New `COOKIE_SECURE` variable, default on in production, so HTTP tests can turn it off                                                  |
| CI            | A job creates `.env` from the example, validates the compose files and builds both images                                              |

## Things that are easy to get wrong

- nginx must send `Host $http_host` (with the port). The CSRF check of the API compares the
  `Origin` header with `<scheme>://<host>`, and `$host` drops the port.
- `TRUST_PROXY=true` is required behind nginx, otherwise the rate limit sees only the proxy address.
- Adding `add_header` inside a `location` drops the headers set at the server level. The config uses
  `expires` there to avoid that.
- Never append to a client supplied `X-Forwarded-For`: the API trusts the proxy, so a faked header would let
  anybody dodge the per-IP rate limits. nginx sets it to `$remote_addr`.
- nginx resolves `api` at request time (`resolver 127.0.0.11`), so recreating the API container does not
  leave the site container pointing at an old address.
- The CSP allows `https://tile.openstreetmap.org` for map tiles. A stricter policy breaks the map.

## Consequences

- The `uploads` volume and the database volume are the only state. Back both up (see the runbook).
- Container logs rotate (10 MB, 3 files per service), so a long running server does not fill its disk.
- The API image keeps dev dependencies (tsx and the Prisma CLI), so it is larger than a compiled build.
  Moving to a compiled output (esbuild or tsc with explicit extensions) is a possible later change.
