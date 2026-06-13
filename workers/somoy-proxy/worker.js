addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) {
      return new Response('Missing `url` query parameter.', { status: 400 })
    }

    // Decode and validate
    const decoded = decodeURIComponent(target);
    const origin = new URL(decoded).origin;

    // Prepare fetch options: forward method and range header if present
    const headers = {};
    const range = request.headers.get('range');
    if (range) headers['Range'] = range;

    const resp = await fetch(decoded, {
      method: 'GET',
      headers,
      // cf fetch options could be added here
    });

    // If this looks like an M3U8 playlist, rewrite segment URLs to route through this worker
    const contentType = resp.headers.get('content-type') || '';
    const isM3u8 = contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL') || (await maybeIsM3U8(resp));

    if (isM3u8) {
      const text = await resp.text();
      const base = decoded.substring(0, decoded.lastIndexOf('/') + 1);
      const lines = text.split(/\r?\n/);
      const rewritten = lines.map(line => {
        if (!line || line.startsWith('#')) return line;
        // Absolute URL
        if (/^https?:\/\//i.test(line)) {
          return `${url.origin}${url.pathname}?url=${encodeURIComponent(line)}`;
        }
        // Relative URL -> resolve against base
        try {
          const resolved = new URL(line, base).href;
          return `${url.origin}${url.pathname}?url=${encodeURIComponent(resolved)}`;
        } catch (e) {
          return line;
        }
      }).join('\n');

      const headersOut = new Headers(resp.headers);
      headersOut.set('access-control-allow-origin', '*');
      headersOut.set('content-type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, { status: 200, headers: headersOut });
    }

    // For media segments and other assets, stream through and add CORS
    const headersOut = new Headers(resp.headers);
    headersOut.set('access-control-allow-origin', '*');
    // Allow range responses
    if (reqSupportsRanges(resp)) headersOut.set('accept-ranges', 'bytes');

    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: headersOut });
  } catch (err) {
    return new Response('Proxy error: ' + err.message, { status: 502 });
  }
}

async function maybeIsM3U8(resp) {
  // Try to peek at the start of the body (without consuming stream twice)
  try {
    const txt = await resp.clone().text();
    return txt.includes('#EXTM3U');
  } catch (e) {
    return false;
  }
}

function reqSupportsRanges(resp) {
  const accept = resp.headers.get('accept-ranges');
  return !!accept && accept !== 'none';
}
