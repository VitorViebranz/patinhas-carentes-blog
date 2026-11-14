# Deploy runbook

Two ways to run the site on a Linux server. Pick one. Confirm with the Univille IT team which one is
allowed (build prompt, section 14, questions 1 to 3).

## A. Docker Compose (recommended)

### First deploy

```bash
git clone <repository> patinhas && cd patinhas
cp .env.example .env
```

Edit `.env`:

| Variable                              | Value                                                        |
| ------------------------------------- | ------------------------------------------------------------ |
| `POSTGRES_PASSWORD`                   | `openssl rand -hex 24`                                       |
| `SESSION_SECRET`                      | `openssl rand -hex 32`                                       |
| `SEED_ADMIN_EMAIL` and `..._PASSWORD` | The one administrator (password with 10 or more characters)  |
| `GEOCODER_USER_AGENT`                 | Project name and a contact e-mail (Nominatim policy)         |
| `ALLOWED_ORIGINS`                     | Leave empty when the site and the API share the domain       |
| `WEB_PORT`                            | Port published on the host (default 8847)                    |
| `WEB_BIND`                            | Address of that port: 127.0.0.1 (default) or 0.0.0.0         |
| `API_PORT`                            | API port on 127.0.0.1 of the host, for checks (default 8848) |

The API container receives the whole `.env` (`env_file`), so every API variable of `.env.example` works
in Docker too (rate limits, upload size, geocoder URLs). The compose file then forces the values the
container needs: `NODE_ENV`, `HOST`, `PORT`, `DATABASE_URL`, `UPLOAD_DIR` and `TRUST_PROXY`.

Then:

```bash
docker compose up --build -d
docker compose ps                                    # db, api and web should be healthy
docker compose run --rm api npm run db:seed:prod     # 166 points, settings, first admin (safe to repeat)
```

The site port is bound to `127.0.0.1` by default (`WEB_BIND`), so only the proxy on the same host reaches it.
Keep it that way in production: the container trusts `X-Forwarded-For` from private addresses to find the
visitor's real IP (login and form rate limits), and that header is spoofable if the port is open to the
internet. After the first seed, delete `SEED_ADMIN_PASSWORD` from `.env` and run `make up`, because the
API container receives the whole file. In production the API refuses to start with the example
`SESSION_SECRET`.

Put the host nginx (or the Univille proxy) in front with HTTPS and forward to `127.0.0.1:${WEB_PORT}`.
Send `X-Forwarded-Proto: https` and the original `Host`. The session cookie is `Secure`, so the panel
login only works over HTTPS (or on `localhost`).

### Shortcuts

`make up`, `make seed-docker`, `make logs`, `make ps`, `make docker-check`, `make backup` and `make restore file=...` wrap the
commands below. Run `make` for the full list.

### Update

```bash
git pull
docker compose up --build -d      # migrations run when the API container starts
docker compose logs -f api
```

### Logs, status, restart

```bash
docker compose ps
docker compose logs --tail 100 api
docker compose restart api
```

The API logs JSON through Pino and redacts cookies, phones and e-mails.

### Backup and restore

State lives in two volumes: `db-data` (PostgreSQL) and `uploads` (story photos).

```bash
# database
docker compose exec -T db pg_dump -U postgres -Fc patinhas > backup-$(date +%F).dump
# photos
docker run --rm -v patinhas_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

Restore into an empty database:

```bash
docker compose exec -T db pg_restore -U postgres -d patinhas --clean --if-exists < backup-YYYY-MM-DD.dump
```

Schedule the two commands (cron) and copy the files to a place outside the server. Test a restore
on a spare machine before relying on it.

### Rotating the session secret

Changing `SESSION_SECRET` logs everybody out. Edit `.env` and run `docker compose up -d api`.

## B. Without Docker (nginx and systemd)

1. Install Node 24, PostgreSQL 16 and nginx. Create a `patinhas` user and a database.
2. Clone the repository to `/opt/patinhas` and run `npm ci`, `npm run db:generate -w @patinhas/api`.
3. Copy `.env.example` to `/etc/patinhas/api.env` with `NODE_ENV=production`, `HOST=127.0.0.1`,
   `TRUST_PROXY=true`, `UPLOAD_DIR=/var/lib/patinhas/uploads` and the real secrets.
4. `npm run db:deploy -w @patinhas/api`, then the seed once (`npm run db:seed:prod -w @patinhas/api`
   with the variables exported).
5. Build the site: `npm run build -w @patinhas/web`, then copy `apps/web/dist` to `/var/www/patinhas`.
6. Install `deploy/patinhas-api.service` and `deploy/nginx.conf.example`, adjusting paths and domain.
7. Reload nginx, start the service, enable HTTPS (certbot or the Univille certificate).

Update: `git pull`, `npm ci`, `npm run db:deploy -w @patinhas/api`, rebuild the site, restart the service.

## Checks after a deploy

- `curl -fsS https://<domain>/api/v1/health` answers `{"status":"ok",...}` and `/api/v1/ready` reports the database up.
- The home shows the points on the map and the monthly average.
- Log in at `/admin/login`, edit one point and see it on the site.
- Submit a test request on `/escolas-e-empresas` and answer it in the panel.

## Troubleshooting

| Symptom                                  | Likely cause                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Login returns 403                        | `Origin` does not match `Host`. Check `Host $http_host` and `X-Forwarded-Proto`                     |
| Login works, then the panel logs you out | The cookie is `Secure` but the site is on plain HTTP. Use HTTPS or `COOKIE_SECURE=false` for a test |
| Everybody gets 429                       | `TRUST_PROXY` is false, so the limiter sees one address                                             |
| API container restarts in a loop         | Read `docker compose logs api`: a bad variable names the field                                      |
| Site is not on the port of `.env`        | Run `make docker-check`: it shows the ports, the container state and the last logs                  |
| `port is already allocated`              | Another project uses that port. Change `WEB_PORT` or `API_PORT` in `.env` and run `make up`         |
| `.env` values seem ignored               | Windows line endings (CRLF) in `.env`. `make docker-check` detects it. Run `dos2unix .env`          |
| " < .env > .env.new && mv .env.new .env` |
| $//' .env`                               |
| Map is blank                             | A stricter CSP blocks `tile.openstreetmap.org`, or the server has no internet                       |
| New points have approximate position     | Geocoding failed (no internet or Nominatim limit). Pick the position in the panel                   |
