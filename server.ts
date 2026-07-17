import express from "express";
import path from "path";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { modernCss, injectFloatingButton } from "./src/modernCss";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const decompressIfNeeded = (buffer: Buffer, contentEncoding?: string): Buffer => {
    if (!contentEncoding) return buffer;
    try {
      if (contentEncoding.includes('gzip')) {
        return zlib.gunzipSync(buffer);
      } else if (contentEncoding.includes('deflate')) {
        return zlib.inflateSync(buffer);
      } else if (contentEncoding.includes('br')) {
        return zlib.brotliDecompressSync(buffer);
      }
    } catch (err) {
      console.error('Failed to decompress proxy response buffer:', err);
    }
    return buffer;
  };

  // Proxy for telonime
  app.use('/telonime', createProxyMiddleware({
    target: 'https://anoboy.xyz',
    changeOrigin: true,
    pathRewrite: (path) => {
      const parts = path.split('?');
      const rewrittenPath = parts[0].replace(/^\/telonime/, '').replace(/telonime/gi, 'anoboy');
      return rewrittenPath + (parts[1] ? '?' + parts[1] : '');
    },
    selfHandleResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://anoboy.xyz/',
      'Accept-Encoding': 'identity'
    },
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        // Strip security headers to allow embedding
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');

        const contentEncoding = proxyRes.headers['content-encoding'];
        let decompressedBuffer = responseBuffer;
        if (contentEncoding) {
          decompressedBuffer = decompressIfNeeded(responseBuffer, contentEncoding);
          res.removeHeader('content-encoding');
        }

        const contentType = proxyRes.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          let html = decompressedBuffer.toString('utf8');
          
          const isPlayerPage = req.url ? (req.url.includes('yup.php') || req.url.includes('embed') || req.url.includes('player') || req.url.includes('uploads') || req.url.includes('adsbatch')) : false;

          // 1. Rewrite relative absolute paths (generalized to match href, src, action, data-video, data-src)
          html = html.replace(/(href|src|action|data-video|data-src)=(["'])\/([^/])/gi, '$1=$2/telonime/$3');
          
          // 2. Rewrite full domain paths (handling subdomains and common anoboy TLDs)
          html = html.replace(/https?:\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');

          // 3. Rebrand references
          html = html.replace(/anoBoy/gi, 'telonime');
          
          if (!isPlayerPage) {
            // 4. Inject modern styles
            html = html.replace(/<\/head>/i, modernCss + '</head>');
            return injectFloatingButton(html);
          }
          
          return html;
        } else if (contentType && contentType.includes('text/css')) {
          let css = decompressedBuffer.toString('utf8');
          css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/telonime/');
          return css;
        }
        return decompressedBuffer;
      })
    }
  }));

  // Redirect wp-content, wp-includes, wp-json, wp-admin to /teloapk/...
  app.use(['/wp-content', '/wp-includes', '/wp-json', '/wp-admin'], (req, res) => {
    return res.redirect(301, `/teloapk${req.originalUrl}`);
  });

  // Intercept and redirect download-related paths directly to LiteAPKs to avoid Cloudflare 403/Turnstile issues
  app.use((req, res, next) => {
    const isDownloadPath = req.path.startsWith('/teloapk/download') || 
                           req.path.startsWith('/teloapk/file') || 
                           req.path.startsWith('/teloapk/get');
    if (isDownloadPath) {
      const targetUrl = 'https://liteapks.com' + req.originalUrl.replace(/^\/teloapk/, '');
      console.log(`Redirecting download link to avoid Cloudflare 403: ${targetUrl}`);
      return res.redirect(302, targetUrl);
    }
    next();
  });

  // Proxy for LiteAPKs
  app.use('/teloapk', createProxyMiddleware({
    target: 'https://liteapks.com',
    changeOrigin: true,
    pathRewrite: (path) => {
      const parts = path.split('?');
      const rewrittenPath = parts[0].replace(/^\/teloapk/, '').replace(/teloapk/gi, 'liteapks');
      return rewrittenPath + (parts[1] ? '?' + parts[1] : '');
    },
    selfHandleResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://liteapks.com/',
      'Accept-Encoding': 'identity'
    },
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        // Strip security headers to allow embedding
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');

        const contentEncoding = proxyRes.headers['content-encoding'];
        let decompressedBuffer = responseBuffer;
        if (contentEncoding) {
          decompressedBuffer = decompressIfNeeded(responseBuffer, contentEncoding);
          res.removeHeader('content-encoding');
        }

        const contentType = proxyRes.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          let html = decompressedBuffer.toString('utf8');
          
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
          return injectFloatingButton(html);
        } else if (contentType && contentType.includes('text/css')) {
          let css = decompressedBuffer.toString('utf8');
          css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/teloapk/');
          return css;
        }
        return decompressedBuffer;
      })
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
