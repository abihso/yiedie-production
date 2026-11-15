# Mobile login while keeping both domains

The frontend stays hosted on `https://yiedie.com` and the backend stays hosted
on `https://altbittek.com`. Apache on the frontend host forwards API requests
to the existing backend:

```text
Browser -> https://yiedie.com/api/auth/login
        -> https://altbittek.com/api/auth/login
```

The browser receives a cookie for `yiedie.com`, so login no longer depends on
third-party cookies being allowed. CSRF validation stays enabled. Proxy
Socket.IO too, so chat and calls use the same session cookie as login.

## 1. Ask the cPanel hosting provider to install the proxy

Send this message with `yiedie-apache-proxy.conf` attached:

> Please configure an HTTPS reverse proxy in the Apache SSL VirtualHost for
> yiedie.com, using a persistent cPanel-supported include. Keep the existing
> frontend DocumentRoot. Forward /api/ to https://altbittek.com/api/,
> /socket.io/ to https://altbittek.com/socket.io/ (including WebSocket upgrades
> and HTTP polling), and /uploads/ to https://altbittek.com/uploads/.
> Please enable the required proxy modules, configure trusted system CAs for
> upstream TLS verification, and keep upstream certificate verification on.
> Preserve Cookie, Set-Cookie, Origin, Authorization, and X-CSRF-Token headers;
> do not cache API responses. These routes must bypass the frontend SPA
> fallback to index.html. Please syntax-check and reload Apache after adding
> the attached configuration. The backend must remain hosted on altbittek.com.

This is server configuration, not a file to upload to `public_html` or paste
into `.htaccess`. If the provider does not permit reverse proxying on the
shared plan, this deployment needs a hosting plan or gateway that does.
Changing the frontend alone cannot enable the server-side proxy.

The backend must continue to allow `https://yiedie.com` in `CLIENT_ORIGINS`.
Keep its existing secure session and CSRF settings. If users also access the
`www` hostname, redirect it to `https://yiedie.com` so there is one frontend
origin. The backend's existing Nginx proxy should continue forwarding the
HTTPS protocol to Node. Proxy trust must match its actual trusted network
topology; do not change the hop count blindly.

## 2. Verify the proxy before switching the frontend

Open `https://yiedie.com/api/health`: it must return the backend health JSON,
not the frontend HTML page. In the browser Network panel, check that
`https://yiedie.com/api/auth/csrf` returns JSON containing `csrfToken` and sets
the `yiedie.sid` cookie for a new session. A second request with that cookie
must return the same token. Do not share cookie or token values.

## 3. Rebuild and upload the frontend

After the proxy checks pass, change the existing frontend `.env` entry to:

```dotenv
VITE_API_URL=https://yiedie.com/api
```

Then run `npm run build` and upload the contents of `dist/` to the existing
cPanel frontend document root. The frontend already uses this setting for
API requests, Socket.IO, and relative upload URLs; no new API client is needed.

Reload on the phone and test login, a page refresh, logout, uploads, and
realtime chat/calls. API and Socket.IO requests should go to `yiedie.com` in
the browser; Apache forwards them to `altbittek.com`. Existing users may need
to sign in again because the old session cookie belongs to `altbittek.com`.

Reference: [Apache reverse proxy and WebSocket configuration](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html).
