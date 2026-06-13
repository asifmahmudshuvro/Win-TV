Cloudflare Worker: Somoy TV proxy

This Worker proxies HLS playlists and segments over HTTPS and adds CORS headers.
It rewrites playlist segment URLs so the player can fetch them through the Worker.

Files:
- `worker.js` — the Cloudflare Worker source.

Quick deploy (using Wrangler):

1. Install Wrangler (Cloudflare Workers CLI):

```bash
npm install -g wrangler
```

2. Log in to Cloudflare:

```bash
wrangler login
```

3. Create a `wrangler.toml` next to `worker.js` with this minimal content (replace placeholders):

```toml
name = "somoy-proxy"
main = "worker.js"
account_id = "YOUR_ACCOUNT_ID"
compatibility_date = "2026-01-01"
```

4. Publish the Worker:

```bash
cd workers/somoy-proxy
wrangler publish
```

The published worker URL will look like `https://somoy-proxy.<your-subdomain>.workers.dev`.

Usage example — proxy an existing HTTP playlist:

If the original Somoy TV playlist is:

```
http://103.151.60.188:1111/Somoy-TV-SD-700kb/tracks-v1a1/mono.m3u8
```

Use the worker URL like this (URL-encode the target):

```
https://somoy-proxy.<your-domain>.workers.dev/?url=http%3A%2F%2F103.151.60.188%3A1111%2FSomoy-TV-SD-700kb%2Ftracks-v1a1%2Fmono.m3u8
```

Then update the channel entry in `index.html` to use the worker URL instead of the original HTTP URL.

Security notes:
- This worker is an open proxy. For production, restrict allowed origins or add an allowlist of target hosts.
- If you need higher performance or TLS options, consider Cloudflare Workers + KV or a dedicated proxy server.
