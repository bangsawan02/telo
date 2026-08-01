export const modernCssTelonime = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    
    /* Clean layout, removing ads and bloated elements */
    #ad_box, #ad_bawah, #countDown2, #judi, #judi2, [id^="judi"], #coloma, .sidea, .sideb, .clear, .clear-both, .home_baner, script[src*="histats"], .theme-switch-wrapper, select#genre + noscript, .social-home, iframe[src*="histats"], .widget_histats {
      display: none !important;
    }
    
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    
    body, html {
      background-color: #f8fafc !important;
      color: #0f172a !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
    }
    
    .wrap {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .container {
      max-width: 1200px !important;
      margin: 0 auto !important;
      padding: 16px 12px !important;
      background: transparent !important;
    }
    
    /* Modern Header */
    #menu-icon {
      background-color: rgba(255, 255, 255, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 12px 20px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      height: auto !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 1000 !important;
      max-width: 100% !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
      gap: 12px !important;
    }
    
    .menukanan {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      flex: 1 !important;
      justify-content: flex-end !important;
    }
    
    .m-header img {
      display: none !important;
    }
    
    .m-header {
      display: inline-flex !important;
      align-items: center !important;
      text-decoration: none !important;
      flex-shrink: 0 !important;
    }
    
    .m-header::after {
      content: 'telonime' !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 22px !important;
      font-weight: 800 !important;
      color: #ff6b00 !important;
      text-transform: lowercase !important;
      letter-spacing: -0.6px !important;
    }
    
    #genre {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 10px !important;
      padding: 0 10px !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      height: 38px !important;
      margin: 0 !important;
      outline: none !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
      flex-shrink: 0 !important;
      cursor: pointer !important;
    }
    
    #genre:focus {
      border-color: #ff6b00 !important;
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12) !important;
    }
    
    .nav-search {
      max-width: 280px !important;
      margin: 0 !important;
      flex-grow: 1 !important;
    }
    
    .nav-search input {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 10px !important;
      padding: 0 14px !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 13px !important;
      width: 100% !important;
      height: 38px !important;
      line-height: 38px !important;
      text-align: left !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
    }
    
    .nav-search input:focus {
      outline: none !important;
      border-color: #ff6b00 !important;
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12) !important;
    }
    
    /* Responsive Header Adjustment */
    @media (max-width: 640px) {
      #menu-icon {
        flex-direction: row !important;
        flex-wrap: wrap !important;
        padding: 10px 12px !important;
        gap: 8px !important;
      }
      .m-header::after {
        font-size: 20px !important;
      }
      .menukanan {
        width: 100% !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }
      #genre {
        width: auto !important;
        min-width: 80px !important;
        max-width: 105px !important;
        font-size: 12px !important;
        padding: 0 6px !important;
      }
      .nav-search {
        max-width: none !important;
        flex: 1 !important;
      }
      .nav-search input {
        font-size: 12px !important;
        padding: 0 10px !important;
      }
    }
    
    /* Navigation Menu */
    #nav-responsive {
      background: #ffffff !important;
      padding: 10px 12px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      display: block !important;
      position: static !important;
      width: auto !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
    }
    
    #nav-responsive ul.menu {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
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
      font-size: 12px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      transition: all 0.2s ease !important;
    }
    
    #nav-responsive ul.menu li a:hover,
    #nav-responsive ul.menu li.current-menu-item a {
      background: #ff6b00 !important;
      color: #ffffff !important;
      border-color: #ff6b00 !important;
      box-shadow: 0 2px 8px rgba(255, 107, 0, 0.25) !important;
    }
    
    /* Anime Grid Layout */
    .home_index {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
      gap: 16px !important;
      padding: 16px 0 !important;
      width: 100% !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
    }
    
    @media (min-width: 640px) {
      .home_index {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
        gap: 20px !important;
      }
    }
    
    .home_index > a {
      text-decoration: none !important;
      color: inherit !important;
      display: block !important;
    }
    
    /* Anime Card Component */
    .amv {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      position: relative !important;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      width: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02) !important;
    }
    
    .amv:hover {
      transform: translateY(-4px) !important;
      border-color: #ff6b00 !important;
      box-shadow: 0 10px 20px -5px rgba(255, 107, 0, 0.15) !important;
    }
    
    .amv img {
      width: 100% !important;
      height: 160px !important;
      object-fit: cover !important;
      border-bottom: 1px solid #f1f5f9 !important;
      transition: transform 0.4s ease !important;
    }
    
    .amv:hover img {
      transform: scale(1.05) !important;
    }
    
    .amvj {
      position: static !important;
      padding: 12px !important;
      flex-grow: 1 !important;
      display: flex !important;
      align-items: flex-start !important;
      background: #ffffff !important;
    }
    
    .ibox1 {
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      line-height: 1.4 !important;
      color: #0f172a !important;
      margin: 0 !important;
      text-align: left !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      height: auto !important;
      transition: color 0.2s ease !important;
    }
    
    .amv:hover .ibox1 {
      color: #ff6b00 !important;
    }
    
    /* Episode Badge */
    .jamup {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      bottom: auto !important;
      background: rgba(15, 23, 42, 0.85) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      color: #ffffff !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      padding: 3px 8px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
      z-index: 10 !important;
    }
    
    /* Video Player Container Styling */
    #mediaplayer {
      width: 100% !important;
      min-height: 200px !important;
      height: auto !important;
      border-radius: 14px !important;
      background: #0f172a !important;
      color: #ffffff !important;
      margin: 16px 0 !important;
      padding: 16px !important;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12) !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      overflow: hidden !important;
    }
    
    #mediaplayer iframe {
      width: 100% !important;
      aspect-ratio: 16/9 !important;
      height: auto !important;
      border: none !important;
      border-radius: 10px !important;
      display: block !important;
    }
    
    #mediaplayer p, #mediaplayer h3, #mediaplayer div {
      color: #f8fafc !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 14px !important;
      margin: 6px 0 !important;
    }
    
    #mediaplayer a, #mediaplayer button, #mediaplayer .btn {
      background: #ff6b00 !important;
      color: #ffffff !important;
      border-radius: 8px !important;
      padding: 8px 14px !important;
      font-weight: 700 !important;
      text-decoration: none !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin: 4px !important;
      font-size: 12px !important;
      border: none !important;
      box-shadow: 0 2px 6px rgba(255, 107, 0, 0.3) !important;
      transition: all 0.2s ease !important;
    }
    
    #mediaplayer a:hover {
      background: #e66000 !important;
    }
    
    /* Floating Back Button */
    .portal-back-floating {
      position: fixed !important;
      bottom: 16px !important;
      right: 16px !important;
      z-index: 999999 !important;
      background: #ff6b00 !important;
      color: #ffffff !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      text-decoration: none !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 14px rgba(255, 107, 0, 0.35) !important;
      transition: all 0.2s ease !important;
      opacity: 0.95 !important;
    }
    
    .portal-back-floating:hover {
      opacity: 1 !important;
      transform: translateY(-2px) !important;
    }
  </style>
`;

export const modernCssTeloapk = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    
    /* Clean layout for Teloapk */
    #ad_box, #ad_bawah, [id^="judi"], .ad-banner, .adsbygoogle, .popup-overlay, script[src*="histats"] {
      display: none !important;
    }
    
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    
    body, html {
      background-color: #09090b !important;
      color: #f4f4f5 !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Header Rebranding */
    .navbar-brand span, .site-title, .logo-text, .brand-title {
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-weight: 800 !important;
      color: #10b981 !important;
    }
    
    /* Download Buttons */
    .btn-download, .btn-success, .btn-primary, .download-btn {
      background: #10b981 !important;
      border-color: #10b981 !important;
      color: #ffffff !important;
      border-radius: 10px !important;
      font-weight: 700 !important;
      transition: all 0.2s ease !important;
    }
    
    .btn-download:hover, .btn-success:hover, .btn-primary:hover, .download-btn:hover {
      background: #059669 !important;
      border-color: #059669 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    }
    
    /* Floating Back Button */
    .portal-back-floating {
      position: fixed !important;
      bottom: 16px !important;
      right: 16px !important;
      z-index: 999999 !important;
      background: #10b981 !important;
      color: #ffffff !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      text-decoration: none !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;
      transition: all 0.2s ease !important;
      opacity: 0.95 !important;
    }
    
    .portal-back-floating:hover {
      opacity: 1 !important;
      transform: translateY(-2px) !important;
    }
  </style>
`;

export const modernCss = modernCssTelonime;

export const injectFloatingButton = (html: string, portalName: string = 'Telonime', portalUrl: string = '/') => {
  const isTeloapk = portalName.toLowerCase().includes('teloapk');
  const label = isTeloapk ? '← Portal Utama' : '← Portal Utama';
  const buttonHtml = `
    <a href="${portalUrl}" class="portal-back-floating">
      ${label}
    </a>
  `;
  return html.replace(/<\/body>/i, buttonHtml + '</body>');
};
