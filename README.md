# Yiedie backend

## Serve the frontend from the backend

Install dependencies for both projects once:

```sh
npm ci
npm ci --prefix windows-yeidie-froned-main
```

With the backend database and session environment configured, run `npm start`
and open `http://localhost:4000/` (or your configured `PORT`). Both `npm start`
and `npm run dev` build the React frontend before starting the backend. The
backend serves the build from `windows-yeidie-froned-main/dist` at `/`, with
frontend route refreshes supported. API endpoints remain under `/api`, and
Socket.IO remains under `/socket.io`.

This build uses `/api` on the same origin, overriding the frontend's
`VITE_API_URL` setting for separate deployments. Add the origin you open in
the browser to `CLIENT_ORIGINS` so API mutations and socket connections are
allowed. The default list already includes `http://localhost:4000`.
For HTTPS deployments behind a proxy, configure `TRUST_PROXY` as described
below and forward all paths to the backend, including WebSocket upgrades.

To rebuild frontend edits while the backend is running, run
`npm run build:frontend`. The backend immediately serves the updated files.
When launching directly with `node src/index.js` or a process manager, run
`npm run build:frontend` first. Build-time frontend dependencies must be
installed; do not omit dev dependencies in the build environment.

## Render deployment

Use `npm ci && npm ci --prefix windows-yeidie-froned-main && npm run build:frontend`
as the build command, `node src/index.js` as the start command, and
`/api/health` as the health check path. The server uses Render's `PORT`.
Include the frontend directory in the deployed source. To use the frontend
served by Render, also add your Render service origin to `CLIENT_ORIGINS`.

Set these variables in the Render service's **Environment** settings:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
CLIENT_ORIGINS=https://pro-yiedie.vercel.app
COOKIE_SAME_SITE=none
TRUST_PROXY=1
```

Keep your `DATABASE_URL` and `SESSION_SECRET` configured as secrets. Save the
environment changes and redeploy the backend with the latest code.

`CLIENT_ORIGINS` contains frontend origins, without paths or trailing slashes.
For multiple frontends, use a comma-separated list of their exact origins.
An environment value replaces the default list in `src/config.js`; copying the
local `.env` to Render would allow only localhost and retain development cookie
settings. Set the production values above explicitly.

On Render, `TRUST_PROXY` defaults to `1` so secure cookies work behind its HTTPS
proxy. An explicit value such as `TRUST_PROXY=0` overrides that default.
`COOKIE_SAME_SITE=none` requires `NODE_ENV=production` and HTTPS.

### S3 uploads

The backend uses S3 for avatar images, community post media, and private chat
attachments when `AWS_BUCKET_NAME` is set. Configure `AWS_REGION` and provide
AWS credentials through the runtime's IAM role or the existing
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables. Do not
commit credentials.

Set `AWS_PUBLIC_BASE_URL` to the root URL of your CloudFront distribution or
other public asset domain when using one. Without it, public media URLs use the
regional S3 bucket URL, so the bucket must allow reads under the `uploads/`
prefix. Grant the backend identity `s3:PutObject`, `s3:GetObject`, and
`s3:DeleteObject` for the bucket objects. Chat attachments are stored under
`messages/` and are only downloaded through the authenticated API; do not make
that prefix publicly readable. The backend does not set object ACLs.

Without `AWS_BUCKET_NAME`, the backend continues storing uploads on local disk.

In the Vercel frontend project's environment settings, set:

```dotenv
VITE_API_URL=https://yeidie-backend.onrender.com/api
```

Redeploy the frontend after changing this value. The frontend already includes
credentials on API requests and sends `X-CSRF-Token` for mutations.

### Verify CORS

```sh
curl -i -X OPTIONS 'https://yeidie-backend.onrender.com/api/auth/login' \
  -H 'Origin: https://pro-yiedie.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,x-csrf-token'
```

Expect HTTP `204`, `Access-Control-Allow-Origin: https://pro-yiedie.vercel.app`,
`Access-Control-Allow-Credentials: true`, and the requested headers in
`Access-Control-Allow-Headers`.

`GET /api/auth/csrf` over HTTPS should return a session cookie with `Secure`,
`HttpOnly`, and `SameSite=None`. If CORS succeeds but login returns
`CSRF_INVALID`, check that the browser stores and sends this cookie. Browser
settings that block third-party cookies can prevent sessions between the
Vercel and Render domains; using frontend and API custom domains under the same
site avoids that cross-site dependency.

If the service returns `502` or `503`, check Render's startup and database logs.
Those responses can appear as browser CORS errors when the application never
gets a chance to add its headers.

References: [Render web services](https://render.com/docs/web-services),
[Render environment variables](https://render.com/docs/environment-variables),
and [Express session proxy and cookie settings](https://expressjs.com/en/resources/middleware/session/).

## DigitalOcean Droplet deployment

The GitHub deployment workflow installs frontend dependencies and builds the
frontend on the GitHub runner using Node 24 and an npm cache. Icon packages
come from npm rather than GitLab SSH repositories. The Droplet only updates
the source, installs backend production dependencies, receives the built
frontend, and restarts `yiedie-backend.service`.

The frontend source must be committed as regular files in this repository.
The generated `dist` directory is uploaded automatically and stays ignored by
Git. Uploads go to a temporary `.deploy` directory; assets are copied before
the new `index.html` is published. Previous hashed assets remain available to
already-open browser tabs. The source commit on the Droplet must match the
build's commit, otherwise deployment stops and the newer run should be used.

Actions shows separate steps for installation, building, SSH, upload, and
restart. Each step has a time limit, and Git/sudo cannot wait for interactive
input. Deployments run one at a time. The existing `DROPLET_HOST`,
`DROPLET_USER`, and `DROPLET_SSH_KEY` secrets are also used for uploads. The
deploy user must have passwordless sudo permission for the service restart
command. Configure the service to run `node src/index.js` directly; `npm start`
would run the local frontend build hook again on the Droplet.

If deployment stalls, expand the running step. No `SSH connected` message in
the source-update step points to connection/session setup. A remote timeout
exits with code 124 (or 137 if forced termination was needed). Workflow changes
apply to new runs after pushing the commit; rerunning an older commit uses its
older workflow.

For a manual deployment that builds on the Droplet instead, run these commands
from the backend repository (this requires enough memory for the frontend build):

```sh
git pull origin main
npm ci --omit=dev
npm ci --prefix windows-yeidie-froned-main --include=dev
npm run build:frontend
test -s windows-yeidie-froned-main/dist/index.html
sudo systemctl restart yiedie-backend.service
```

Only restart after the build succeeds. A `FRONTEND_NOT_BUILT` response at `/`
means the build is missing. For other errors, inspect the server log with
`sudo journalctl -u yiedie-backend.service -n 50 --no-pager` and check which
request path failed.

When Nginx terminates HTTPS and forwards requests to the Node process, set the
backend environment to include:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=1
COOKIE_SAME_SITE=none
CLIENT_ORIGINS=https://altbittek.com,https://yiedie.com
```

Set `CLIENT_ORIGINS` to the exact origin shown in the browser's address bar
(include `https://www.yiedie.com` too if users access the `www` host). Keep
`DATABASE_URL` and `SESSION_SECRET` configured as secrets. Use `TRUST_PROXY=1`
only when exactly one trusted reverse proxy sits in front of Node; use the
number of trusted proxy hops for a different topology. Do not enable proxy
trust when Node is exposed directly to clients.

When opening the backend-hosted frontend at `https://altbittek.com`, that origin
must be in the allowlist for API requests and Socket.IO. Preserve any other
frontend origins you still use. Update the environment used by the systemd
service, then run `sudo systemctl restart yiedie-backend.service`.
An `ORIGIN_DENIED` response means the request's origin is missing from this
list. Public frontend assets are served independently of this API allowlist.

The separately deployed frontend at `https://yiedie.com` calls
`https://altbittek.com/api`. These are different sites, so the API session
cookie needs `SameSite=None; Secure`. In the existing Nginx HTTPS location
that proxies `/api` to Node, ensure these headers are set:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

After editing Nginx, run `sudo nginx -t && sudo systemctl reload nginx`.
Restart the Node process with the updated environment as well. If using
PM2-managed environment variables, restart with `--update-env`.

The backend sets production session cookies as `Secure`. Behind Nginx, Express
must trust the forwarded HTTPS protocol or it will omit that cookie. Without
the cookie, the browser cannot send back the session associated with the CSRF
token, so registration can fail with `CSRF_INVALID` (403). After updating the
environment, restart the backend and rebuild/redeploy the frontend if its
`VITE_API_URL` changed.

Verify in the browser's Network tab that `GET /api/auth/csrf` returns a
`yiedie.sid` cookie with `Secure` and `HttpOnly`, that the browser stores it,
and that the subsequent `POST /api/auth/register` sends both that cookie and
the `X-CSRF-Token` header. Do not share the cookie value. A `401` from
`GET /api/auth/me` while signed out is expected; it should stop after a
successful login or registration.

A successful CSRF response without `Set-Cookie` in a fresh session is a
server/proxy configuration problem; adding another frontend header will not
fix it. If the cookie is issued but the browser blocks it as a third-party
cookie, serve the API under the frontend's site (for example, a same-origin
`/api` reverse proxy) and update the frontend API URL accordingly.

## Checks

```sh
npm run check
npm test
```
