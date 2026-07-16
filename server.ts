import express from "express";
import path from "path";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const modernCss = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    /* Clean layout, removing bloated ads and tracking elements */
    #ad_box, #ad_bawah, #countDown2, #judi, #judi2, [id^="judi"], #coloma, .sidea, .sideb, .clear, .clear-both, .home_baner, script[src*="histats"], .theme-switch-wrapper, select#genre + noscript, .social-home {
      display: none !important;
    }
    
    body, html {
      background-color: #f8fafc !important;
      color: #0f172a !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .wrap {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .container {
      max-width: 1200px !important;
      margin: 0 auto !important;
      padding: 24px 16px !important;
      background: transparent !important;
    }
    
    #menu-icon {
      background-color: rgba(255, 255, 255, 0.9) !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 16px 24px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      height: auto !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 1000 !important;
      backdrop-filter: blur(12px) !important;
      max-width: 100% !important;
    }
    
    .menukanan {
      display: flex !important;
      align-items: center !important;
      gap: 16px !important;
    }
    
    .m-header img {
      display: none !important;
    }
    
    .m-header {
      display: inline-flex !important;
      align-items: center !important;
      text-decoration: none !important;
    }
    
    .m-header::after {
      content: 'telonime' !important;
      font-family: 'Inter', system-ui, sans-serif !important;
      font-size: 24px !important;
      font-weight: 800 !important;
      color: #ff7a00 !important;
      text-transform: lowercase !important;
      letter-spacing: -0.5px !important;
    }
    
    #genre {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 8px !important;
      padding: 6px 12px !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      height: 38px !important;
      margin: 0 !important;
      outline: none !important;
      transition: border-color 0.2s !important;
    }
    
    #genre:focus {
      border-color: #ff7a00 !important;
    }
    
    .nav-search {
      max-width: 300px !important;
      margin: 0 !important;
      flex-grow: 1 !important;
    }
    
    .nav-search input {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      width: 100% !important;
      height: 38px !important;
      text-align: left !important;
      transition: all 0.2s !important;
    }
    
    .nav-search input:focus {
      outline: none !important;
      border-color: #ff7a00 !important;
      box-shadow: 0 0 0 2px rgba(255, 122, 0, 0.2) !important;
    }
    
    #nav-responsive {
      background: #ffffff !important;
      padding: 12px 24px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      display: block !important;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
      position: static !important;
      width: auto !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
    }
    
    #nav-responsive ul.menu {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      list-style: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    #nav-responsive ul.menu li {
      margin: 0 !important;
    }
    
    #nav-responsive ul.menu li a {
      display: inline-block !important;
      padding: 6px 14px !important;
      background: #f1f5f9 !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 20px !important;
      color: #475569 !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      text-decoration: none !important;
      transition: all 0.2s ease !important;
    }
    
    #nav-responsive ul.menu li a:hover,
    #nav-responsive ul.menu li.current-menu-item a {
      background: #ff7a00 !important;
      color: #ffffff !important;
      border-color: #ff7a00 !important;
      box-shadow: 0 4px 12px rgba(255, 122, 0, 0.2) !important;
    }
    
    .home_index {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
      gap: 20px !important;
      padding: 24px 0 !important;
      width: 100% !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
    }
    
    .home_index > a {
      text-decoration: none !important;
      color: inherit !important;
      display: block !important;
    }
    
    .amv {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      position: relative !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      width: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05) !important;
    }
    
    .amv:hover {
      transform: translateY(-4px) !important;
      border-color: #ff7a00 !important;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
    }
    
    .amv img {
      width: 100% !important;
      height: 140px !important;
      object-fit: cover !important;
      border-bottom: 1px solid #e2e8f0 !important;
      transition: transform 0.5s ease !important;
    }
    
    .amv:hover img {
      transform: scale(1.05) !important;
    }
    
    .amvj {
      padding: 12px !important;
      flex-grow: 1 !important;
      display: flex !important;
      align-items: flex-start !important;
      background: transparent !important;
    }
    
    .ibox1 {
      font-family: 'Inter', system-ui, sans-serif !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      line-height: 1.4 !important;
      color: #1e293b !important;
      margin: 0 !important;
      text-align: left !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      height: auto !important;
    }
    
    .jamup {
      background: #f8fafc !important;
      color: #64748b !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 11px !important;
      padding: 6px 12px !important;
      border-top: 1px solid #e2e8f0 !important;
      text-align: left !important;
    }
    
    #jadwal {
      width: 100% !important;
      max-width: 1200px !important;
      margin: 16px auto !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    #jadwal table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 13px !important;
    }
    
    #jadwal th {
      background: #f1f5f9 !important;
      color: #ff7a00 !important;
      font-weight: 600 !important;
      padding: 10px 14px !important;
      text-align: left !important;
      border: none !important;
    }
    
    #jadwal td {
      padding: 10px 14px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #334155 !important;
    }
    
    #jadwal tr:last-child td {
      border-bottom: none !important;
    }
    
    #jadwal a {
      color: #1e293b !important;
      text-decoration: none !important;
      font-weight: 500 !important;
      transition: color 0.2s !important;
    }
    
    #jadwal a:hover {
      color: #ff7a00 !important;
    }
    
    .social {
      border-bottom: 2px solid #ff7a00 !important;
      font-size: 14px !important;
      float: none !important;
      display: inline-block !important;
      margin: 10px !important;
    }
    
    .social a {
      color: #ff7a00 !important;
      text-decoration: none !important;
      font-weight: 600 !important;
    }
    
    .pagetitle {
      margin-bottom: 24px !important;
    }
    
    .pagetitle h1 {
      font-size: 24px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      line-height: 1.3 !important;
      margin: 0 0 8px 0 !important;
    }
    
    .postdetails {
      color: #64748b !important;
      font-size: 13px !important;
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 12px !important;
      align-items: center !important;
      margin-bottom: 20px !important;
    }
    
    .postdetails a {
      color: #ff7a00 !important;
      text-decoration: none !important;
      background: rgba(255, 122, 0, 0.08) !important;
      padding: 2px 8px !important;
      border-radius: 4px !important;
    }
    
    .column-three-fourth {
      width: 100% !important;
      float: none !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      margin-bottom: 24px !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    .column-three-fourth > img {
      border-radius: 8px !important;
      max-width: 320px !important;
      height: auto !important;
      margin: 0 auto 20px auto !important;
      display: block !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
    }
    
    .unduhan {
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #334155 !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      padding: 16px !important;
      margin-bottom: 16px !important;
    }
    
    .unduhan table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    
    .unduhan th {
      text-align: left !important;
      font-weight: 600 !important;
      color: #64748b !important;
      padding: 6px 12px !important;
      width: 120px !important;
    }
    
    .unduhan td {
      padding: 6px 12px !important;
      color: #0f172a !important;
    }
    
    #mediaplayer {
      width: 100% !important;
      aspect-ratio: 16/9 !important;
      height: auto !important;
      border-radius: 16px !important;
      border: 4px solid #1e293b !important;
      background: #000000 !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
      margin: 24px 0 !important;
      transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
    }
    
    #mediaplayer:hover {
      border-color: #ff7a00 !important;
      box-shadow: 0 20px 25px -5px rgba(255, 122, 0, 0.15), 0 10px 10px -5px rgba(255, 122, 0, 0.1) !important;
    }
    
    #fplay {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      margin: 20px 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
    }

    .vmiror {
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #475569 !important;
    }

    #allmiror {
      background: #ffffff !important;
      color: #334155 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 6px 12px !important;
      text-decoration: none !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 2px !important;
      box-shadow: none !important;
      transition: all 0.2s !important;
    }
    
    #allmiror:hover, #allmiror.active {
      background: #ff7a00 !important;
      color: #ffffff !important;
      border-color: #ff7a00 !important;
      box-shadow: 0 4px 12px rgba(255, 122, 0, 0.3) !important;
    }
    
    #navigasi {
      display: flex !important;
      justify-content: space-between !important;
      gap: 16px !important;
      margin: 24px 0 !important;
    }
    
    #navigasi h3.widget-title {
      margin: 0 !important;
      flex: 1 !important;
    }
    
    #navigasi h3.widget-title a {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #334155 !important;
      border-radius: 8px !important;
      padding: 12px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      transition: all 0.2s !important;
    }
    
    #navigasi h3.widget-title a:hover {
      background: #ff7a00 !important;
      color: #ffffff !important;
      border-color: #ff7a00 !important;
    }
    
    .singlelink {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin-top: 24px !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    .singlelink .hq {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #ff7a00 !important;
      margin-bottom: 12px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding-bottom: 8px !important;
    }
    
    .singlelink ul.lcp_catlist {
      list-style: none !important;
      padding: 0 !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
    }
    
    .singlelink ul.lcp_catlist li {
      margin: 0 !important;
    }
    
    .singlelink ul.lcp_catlist li a {
      display: block !important;
      padding: 10px 14px !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      color: #334155 !important;
      text-decoration: none !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      transition: all 0.2s !important;
    }
    
    .singlelink ul.lcp_catlist li a:hover {
      background: #ffffff !important;
      border-color: #ff7a00 !important;
      color: #ff7a00 !important;
      padding-left: 18px !important;
    }
    
    .side_home {
      display: none !important;
    }
    
    /* Elegant light theme styling for Download card */
    .download {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin: 24px 0 !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
      color: #334155 !important;
    }
    
    #colomb {
      float: none !important;
      padding: 0 !important;
    }
    
    .download p {
      margin: 0 !important;
    }
    
    .ud {
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 12px !important;
      margin-bottom: 12px !important;
      padding-bottom: 12px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      font-size: 14px !important;
    }
    
    .ud:last-child {
      border-bottom: none !important;
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
    
    .udj {
      min-width: 80px !important;
      font-weight: 700 !important;
      color: #ff7a00 !important;
    }
    
    .udl {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px !important;
      padding: 4px 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      transition: all 0.2s !important;
    }
    
    .udl:hover {
      background: #ff7a00 !important;
      color: #ffffff !important;
      border-color: #ff7a00 !important;
    }

    /* Elegant light theme styling for anime details description */
    .deskripsi {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 24px !important;
      margin: 24px 0 !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    .sisi {
      margin-bottom: 24px !important;
      text-align: left !important;
    }
    
    .sisi:last-child {
      margin-bottom: 0 !important;
    }
    
    .sisi.entry-content {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 16px !important;
      text-align: left !important;
    }
    
    @media (min-width: 640px) {
      .sisi.entry-content {
        flex-direction: row !important;
      }
    }
    
    .sisi.entry-content img {
      border-radius: 8px !important;
      max-width: 240px !important;
      height: auto !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    }
    
    .entry-title {
      font-size: 20px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      margin: 0 0 8px 0 !important;
    }
    
    .sub {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      border-bottom: 2px solid #ff7a00 !important;
      padding-bottom: 6px !important;
      margin-bottom: 12px !important;
    }
    
    .contentdeks {
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #475569 !important;
      margin-bottom: 16px !important;
    }
    
    .contenttable table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 13px !important;
    }
    
    .contenttable th {
      text-align: left !important;
      font-weight: 600 !important;
      color: #64748b !important;
      padding: 8px 12px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      width: 120px !important;
    }
    
    .contenttable td {
      padding: 8px 12px !important;
      color: #1e293b !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }
    
    .contenttable tr:last-child td, .contenttable tr:last-child th {
      border-bottom: none !important;
    }
    
    .contenttable a {
      color: #ff7a00 !important;
      text-decoration: none !important;
      font-weight: 600 !important;
    }

    /* Pagination styling for light theme */
    .wp-pagenavi, .pagination {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 6px !important;
      margin: 32px auto !important;
      clear: both !important;
      width: 100% !important;
      max-width: 1200px !important;
    }
    .wp-pagenavi a, .wp-pagenavi span, .pagination a, .pagination span {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 36px !important;
      height: 36px !important;
      padding: 0 12px !important;
      border-radius: 8px !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #334155 !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      text-decoration: none !important;
      transition: all 0.2s !important;
    }
    .wp-pagenavi a:hover, .pagination a:hover {
      border-color: #ff7a00 !important;
      color: #ff7a00 !important;
      background: #ffffff !important;
    }
    .wp-pagenavi span.current, .pagination span.current, .wp-pagenavi .current, .pagination .current {
      background: #ff7a00 !important;
      color: #ffffff !important;
      border-color: #ff7a00 !important;
    }

    .footerwrap, .footercopyright {
      background: #ffffff !important;
      border-top: 1px solid #e2e8f0 !important;
      color: #64748b !important;
      font-size: 12px !important;
      padding: 24px !important;
      text-align: center !important;
    }
    
    .footerwrap a, .footercopyright a {
      color: #ff7a00 !important;
      text-decoration: none !important;
    }
  </style>
  `;

  const injectFloatingButton = (html: string) => {
    const buttonHtml = `
      <a href="/" style="position: fixed; bottom: 24px; right: 24px; z-index: 999999; background: #ff7a00; color: #ffffff; padding: 12px 20px; border-radius: 30px; font-family: 'Inter', sans-serif; text-decoration: none; box-shadow: 0 10px 25px rgba(255,122,0,0.4); border: none; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s; box-shadow: 0 8px 16px rgba(0,0,0,0.3);">
        &larr; Back to Portal
      </a>
    `;
    return html.replace(/<\/body>/i, buttonHtml + '</body>');
  };

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
