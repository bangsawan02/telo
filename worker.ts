import { Hono } from 'hono';
import { modernCss, injectFloatingButton } from './src/modernCss';

const app = new Hono<{ Bindings: { ASSETS: { fetch: (request: Request) => Promise<Response> } } }>();

// API / Proxy routes first
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.all('/telonime/*', async (c) => {
  const url = new URL(c.req.url);
  const subpath = url.pathname.substring('/telonime'.length) + url.search;
  const targetUrl = `https://anoboy.xyz${subpath}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set('Host', 'anoboy.xyz');
  headers.set('Referer', 'https://anoboy.xyz/');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Strip Cloudflare-specific or original headers that might cause target rejects
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.raw.arrayBuffer() : undefined,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.delete('X-Frame-Options');
    resHeaders.delete('Content-Security-Policy');
    resHeaders.delete('Content-Security-Policy-Report-Only');
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');
    resHeaders.set('Access-Control-Allow-Origin', '*');

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const isPlayerPage = subpath ? (subpath.includes('yup.php') || subpath.includes('embed') || subpath.includes('player') || subpath.includes('uploads') || subpath.includes('adsbatch')) : false;

      // 1. Rewrite relative absolute paths
      html = html.replace(/(href|src|action|data-video|data-src)=(["'])\/([^/])/gi, '$1=$2/telonime/$3');
      
      // 2. Rewrite full domain paths (handling subdomains and common anoboy TLDs)
      html = html.replace(/https?:\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');

      // 3. Rebrand references
      html = html.replace(/anoBoy/gi, 'telonime');

      if (!isPlayerPage) {
        html = html.replace(/<\/head>/i, modernCss + '</head>');
        html = injectFloatingButton(html);
      }

      c.status(response.status as any);
      resHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return c.html(html);
    } else if (contentType.includes('text/css')) {
      let css = await response.text();
      css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/telonime/');
      
      c.status(response.status as any);
      resHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return c.text(css);
    }

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return c.text(`Proxy error: ${err.message}`, 500);
  }
});

app.all('/teloapk/*', async (c) => {
  const url = new URL(c.req.url);
  const subpath = url.pathname.substring('/teloapk'.length) + url.search;

  const isDownloadPath = url.pathname.startsWith('/teloapk/download') || 
                         url.pathname.startsWith('/teloapk/file') || 
                         url.pathname.startsWith('/teloapk/get');
  if (isDownloadPath) {
    const targetUrl = `https://liteapks.com${subpath}`;
    return c.redirect(targetUrl, 302);
  }

  const targetUrl = `https://liteapks.com${subpath}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set('Host', 'liteapks.com');
  headers.set('Referer', 'https://liteapks.com/');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.raw.arrayBuffer() : undefined,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.delete('X-Frame-Options');
    resHeaders.delete('Content-Security-Policy');
    resHeaders.delete('Content-Security-Policy-Report-Only');
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');
    resHeaders.set('Access-Control-Allow-Origin', '*');

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // 1. Rewrite relative absolute paths
      html = html.replace(/(href|src|action|data-video|data-src)=(["'])\/([^/])/gi, '$1=$2/teloapk/$3');
      
      // 2. Rewrite full domain paths
      html = html.replace(/https?:\/\/(?:[a-zA-Z0-9-]+\.)?liteapks\.com/gi, '/teloapk');

      // 3. Rebrand references
      html = html.replace(/LITEAPKS\.COM/gi, 'teloapk');
      html = html.replace(/LITEAPKS/gi, 'teloapk');
      html = html.replace(/LiteAPKs/gi, 'teloapk');
      html = html.replace(/Liteapks/gi, 'teloapk');
      html = html.replace(/teloapk\.com/gi, 'teloapk');
      html = html.replace(/teloApk/gi, 'teloapk');

      html = html.replace(/<\/head>/i, modernCss + '</head>');
      html = injectFloatingButton(html);

      c.status(response.status as any);
      resHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return c.html(html);
    } else if (contentType.includes('text/css')) {
      let css = await response.text();
      css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/teloapk/');

      c.status(response.status as any);
      resHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return c.text(css);
    }

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return c.text(`Proxy error: ${err.message}`, 500);
  }
});

// For all other requests, fetch them from the ASSETS binding (Wrangler static assets)
app.all('*', async (c) => {
  try {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404) {
      // SPA Fallback: serve index.html for unknown pages
      const url = new URL(c.req.url);
      url.pathname = '/index.html';
      const spaRequest = new Request(url.toString(), c.req.raw);
      return await c.env.ASSETS.fetch(spaRequest);
    }
    return res;
  } catch (e) {
    return c.text('Not found', 404);
  }
});

export default app;
