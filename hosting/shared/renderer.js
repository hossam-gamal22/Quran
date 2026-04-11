// Shared Page Template Renderer
// Used by both admin preview and public page renderer

export const TEMPLATES = {
  'homepage': { name: 'Homepage', icon: '🏠', description: 'Personal homepage with profile and projects' },
  'app-showcase': { name: 'App Showcase', icon: '📱', description: 'Perfect for mobile and web apps' },
  'landing': { name: 'Landing Page', icon: '🚀', description: 'Great for products and campaigns' },
  'portfolio': { name: 'Portfolio Project', icon: '💼', description: 'Showcase your creative work' },
  'article': { name: 'Article', icon: '📝', description: 'Write blog posts and content' }
};

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getStyles(accent) {
  return `
    :root { --accent: ${accent}; --bg: #0a0f1a; --card-bg: rgba(255,255,255,0.05); --text: #e0e0e0; --text-muted: #8a8f98; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.6; }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { opacity: 0.85; }

    /* Navbar */
    .page-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 16px 0; background: rgba(10,15,26,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
    .page-nav .container { display: flex; justify-content: space-between; align-items: center; }
    .page-nav .brand { font-weight: 600; font-size: 1.1rem; color: #fff; }
    .page-nav .nav-link { color: var(--text-muted); font-size: 0.9rem; transition: color 0.2s; }
    .page-nav .nav-link:hover { color: #fff; }
    .page-nav .nav-links-row { display: flex; gap: 8px; }
    .page-nav .nav-links-row .nav-link { padding: 6px 16px; border-radius: 8px; }
    .page-nav .nav-links-row .nav-link:hover { background: rgba(255,255,255,0.06); }

    /* App Showcase */
    .app-hero { text-align: center; padding: 140px 0 60px; }
    .app-icon { font-size: 80px; margin-bottom: 24px; display: block; }
    .app-hero h1 { font-size: 3rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .app-hero .subtitle { font-size: 1.25rem; color: var(--accent); margin-bottom: 16px; font-weight: 500; }
    .app-hero .description { font-size: 1.05rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 32px; }
    .download-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 1rem; transition: all 0.3s; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,152,127,0.3); opacity: 1; }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.12); }
    .btn-secondary:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); opacity: 1; }

    /* Features Grid */
    .features { padding: 40px 0 80px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .feature-card { background: var(--card-bg); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; transition: all 0.3s; }
    .feature-card:hover { transform: translateY(-4px); border-color: rgba(15,152,127,0.3); background: rgba(255,255,255,0.08); }
    .feature-icon { font-size: 40px; display: block; margin-bottom: 16px; }
    .feature-card h3 { font-size: 1.15rem; font-weight: 600; color: #fff; margin-bottom: 8px; }
    .feature-card p { color: var(--text-muted); font-size: 0.95rem; }

    /* Landing Page */
    .landing-hero { text-align: center; padding: 160px 0 80px; background: linear-gradient(135deg, var(--bg) 0%, color-mix(in srgb, var(--accent) 15%, var(--bg)) 100%); }
    .landing-hero h1 { font-size: 3.5rem; font-weight: 700; color: #fff; margin-bottom: 16px; line-height: 1.2; }
    .landing-hero .subtitle { font-size: 1.3rem; color: var(--text-muted); max-width: 650px; margin: 0 auto 36px; }
    .section { padding: 80px 0; }
    .section:nth-child(even) { background: rgba(255,255,255,0.02); }
    .section-header { text-align: center; margin-bottom: 48px; }
    .section-header h2 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .section-header p { color: var(--text-muted); font-size: 1.05rem; max-width: 550px; margin: 0 auto; }
    .content-block { max-width: 800px; margin: 0 auto; }
    .content-block p { color: var(--text); font-size: 1.05rem; line-height: 1.8; margin-bottom: 16px; }
    .cta-section { text-align: center; padding: 80px 0; }
    .cta-section h2 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
    .cta-section p { color: var(--text-muted); margin-bottom: 32px; }

    /* Portfolio */
    .project-hero { padding: 140px 0 60px; }
    .project-hero h1 { font-size: 2.8rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .project-hero .subtitle { font-size: 1.15rem; color: var(--accent); margin-bottom: 20px; }
    .project-hero .description { font-size: 1.05rem; color: var(--text-muted); max-width: 700px; line-height: 1.8; margin-bottom: 24px; }
    .project-links { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
    .tags { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 40px; }
    .tag { background: rgba(15,152,127,0.15); color: var(--accent); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }
    .gallery { padding: 40px 0 80px; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .gallery-grid img { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); transition: transform 0.3s; }
    .gallery-grid img:hover { transform: scale(1.02); }

    /* Article */
    .article-header { padding: 140px 0 40px; text-align: center; }
    .article-header h1 { font-size: 2.5rem; font-weight: 700; color: #fff; margin-bottom: 16px; max-width: 800px; margin-left: auto; margin-right: auto; }
    .article-meta { display: flex; gap: 20px; justify-content: center; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px; }
    .article-tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .article-tag { background: rgba(255,255,255,0.06); color: var(--text-muted); padding: 4px 12px; border-radius: 16px; font-size: 0.8rem; }
    .article-cover { max-width: 900px; margin: 0 auto 48px; }
    .article-cover img { width: 100%; border-radius: 16px; }
    .article-body { max-width: 720px; margin: 0 auto; padding: 0 24px 80px; }
    .article-body h2 { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 40px 0 16px; }
    .article-body h3 { font-size: 1.3rem; font-weight: 600; color: #fff; margin: 32px 0 12px; }
    .article-body p { color: var(--text); font-size: 1.05rem; line-height: 1.9; margin-bottom: 20px; }
    .article-body ul, .article-body ol { color: var(--text); padding-left: 24px; margin-bottom: 20px; }
    .article-body li { margin-bottom: 8px; line-height: 1.7; }
    .article-body blockquote { border-left: 3px solid var(--accent); padding: 16px 24px; margin: 24px 0; background: rgba(255,255,255,0.03); border-radius: 0 8px 8px 0; font-style: italic; color: var(--text-muted); }
    .article-body code { background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; font-size: 0.9rem; }
    .article-body pre { background: rgba(0,0,0,0.4); padding: 20px; border-radius: 12px; overflow-x: auto; margin-bottom: 24px; }
    .article-body pre code { background: none; padding: 0; }

    /* Homepage */
    .home-hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 120px 24px 80px; position: relative; overflow: hidden; }
    .home-hero::before { content: ''; position: absolute; top: -50%; right: -30%; width: 800px; height: 800px; background: radial-gradient(circle, rgba(15,152,127,0.15) 0%, transparent 70%); pointer-events: none; }
    .home-hero-inner { display: flex; align-items: center; gap: 4rem; max-width: 1100px; width: 100%; z-index: 1; }
    .home-photo-wrap { flex-shrink: 0; position: relative; }
    .home-photo { width: 280px; height: 280px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); box-shadow: 0 0 40px rgba(15,152,127,0.15), 0 20px 60px rgba(0,0,0,0.4); transition: transform 0.5s; }
    .home-photo:hover { transform: scale(1.03); }
    .home-photo-wrap::after { content: ''; position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(15,152,127,0.2); animation: pulse-ring 3s ease-in-out infinite; }
    @keyframes pulse-ring { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 0; } }
    .home-hero h1 { font-size: 3.2rem; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -1px; }
    .home-hero .subtitle { font-size: 1.25rem; color: var(--accent); font-weight: 500; margin-bottom: 1.5rem; }
    .home-socials { display: flex; gap: 12px; flex-wrap: wrap; }
    .home-social { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: var(--text-muted); transition: all 0.3s; }
    .home-social:hover { background: var(--accent); color: #fff; border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 8px 25px rgba(15,152,127,0.3); }
    .home-social svg { width: 22px; height: 22px; fill: currentColor; }
    .home-projects { padding: 40px 0 80px; }
    .home-projects h2 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .home-projects .section-sub { color: var(--text-muted); font-size: 1.05rem; margin-bottom: 2.5rem; }
    .home-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    .home-pcard { display: block; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; transition: all 0.4s; text-decoration: none; color: inherit; }
    .home-pcard:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 30px rgba(15,152,127,0.15); }
    .home-pcard-cover { height: 200px; display: flex; align-items: center; justify-content: center; }
    .home-pcard-body { padding: 24px; }
    .home-pcard-body h3 { font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 8px; }
    .home-pcard-body p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }

    @media (max-width: 768px) {
      .home-hero-inner { flex-direction: column; text-align: center; }
      .home-photo { width: 200px; height: 200px; }
      .home-hero h1 { font-size: 2.2rem; }
      .home-socials { justify-content: center; }
    }

    /* Developer Credit */
    .dev-credit { text-align: center; padding: 40px 0; border-top: 1px solid rgba(255,255,255,0.06); }
    .dev-credit p { color: var(--text-muted); font-size: 0.9rem; }
    .dev-credit a { color: var(--accent); font-weight: 500; }

    /* Footer */
    .page-footer { text-align: center; padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.06); }
    .page-footer p { color: var(--text-muted); font-size: 0.85rem; }

    /* Responsive */
    @media (max-width: 768px) {
      .app-hero h1, .landing-hero h1 { font-size: 2rem; }
      .project-hero h1 { font-size: 2rem; }
      .article-header h1 { font-size: 1.8rem; }
      .features-grid { grid-template-columns: 1fr; }
      .gallery-grid { grid-template-columns: 1fr; }
      .app-hero, .landing-hero { padding-top: 100px; }
      .download-buttons { flex-direction: column; align-items: center; }
    }
  `;
}

function wrapHTML(body, data, accent) {
  const title = esc(data.title || 'Page');
  const metaDesc = esc(data.metaDescription || data.subtitle || data.description || '');
  const navLinks = (data.navLinks || []).map(l =>
    `<a href="${esc(l.url)}" class="nav-link">${esc(l.label)}</a>`
  ).join('');
  const hasNav = navLinks.length > 0;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${getStyles(accent)}</style>
</head>
<body>
  <nav class="page-nav">
    <div class="container">
      <a href="/" class="brand">Hossam Gamal</a>
      ${hasNav ? `<div class="nav-links-row">${navLinks}</div>` : `<a href="/" class="nav-link">← Home</a>`}
    </div>
  </nav>
  ${body}
  <footer class="page-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} Hossam Gamal</p>
    </div>
  </footer>
</body>
</html>`;
}

// Social platform SVG icons
const SOCIAL_SVGS = {
  linkedin: '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  behance: '<svg viewBox="0 0 24 24"><path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.63.165-1.27.25-1.95.25H0V4.51h6.938v-.007zM6.545 10.16c.6 0 1.09-.153 1.47-.465.38-.31.57-.75.57-1.325 0-.35-.06-.64-.18-.87-.12-.23-.29-.42-.5-.56-.21-.13-.46-.23-.74-.29-.28-.055-.58-.08-.9-.08H3.38v3.59h3.165zm.18 5.71c.35 0 .69-.04 1.01-.105.32-.07.6-.19.84-.35.24-.16.43-.38.58-.66.14-.28.21-.64.21-1.075 0-.85-.23-1.46-.69-1.83-.46-.37-1.08-.55-1.85-.55H3.38v4.57h3.345zm10.89-2.72c.104.678.41 1.23.92 1.65.513.42 1.14.63 1.885.63.58 0 1.086-.13 1.515-.39.43-.26.75-.57.97-.93h2.84c-.54 1.34-1.33 2.31-2.37 2.9-1.04.59-2.22.89-3.56.89-.86 0-1.66-.14-2.39-.41-.73-.28-1.36-.68-1.89-1.2-.53-.52-.94-1.15-1.24-1.88-.3-.73-.45-1.55-.45-2.45 0-.87.15-1.67.45-2.4.3-.73.71-1.36 1.24-1.88.53-.52 1.15-.93 1.87-1.22.72-.29 1.5-.44 2.36-.44.96 0 1.8.18 2.53.54.73.36 1.34.85 1.82 1.47.49.62.85 1.34 1.07 2.16.23.82.32 1.7.28 2.63h-8.49v.01zm5.58-2.28c-.18-.57-.5-1.03-.96-1.37-.46-.34-1.02-.51-1.67-.51-.42 0-.79.07-1.12.2-.33.14-.62.32-.86.55-.24.23-.42.49-.55.79-.13.3-.22.59-.26.89h5.42v-.01zM15.41 4.89h5.66v1.46H15.41V4.89z"/></svg>',
  vimeo: '<svg viewBox="0 0 24 24"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>',
  github: '<svg viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#0a0f1a" d="M9.545 15.568V8.432L15.818 12z"/></svg>',
  dribbble: '<svg viewBox="0 0 24 24"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702A9.63 9.63 0 0 0 12 1.8c-.817 0-1.615.088-2.4.252zM19.7 5.273c-.218.29-1.89 2.478-5.658 4.015.24.49.473.985.694 1.478.077.172.15.344.224.516 3.423-.43 6.826.26 7.168.338-.03-2.4-.974-4.6-2.427-6.347z"/></svg>',
  website: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
};

function renderHomepage(data, accent) {
  const socials = (data.socialLinks || []).map(s => {
    const svg = SOCIAL_SVGS[s.platform] || SOCIAL_SVGS.website;
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="home-social" title="${esc(s.platform)}">${svg}</a>`;
  }).join('');

  const projects = (data.projects || []).map(p => `
    <a href="${esc(p.url || '#')}" class="home-pcard">
      <div class="home-pcard-cover" style="background: linear-gradient(135deg, #081827, ${accent});">
        <span style="font-size: 4rem;">${esc(p.emoji || '🚀')}</span>
      </div>
      <div class="home-pcard-body">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
      </div>
    </a>`).join('');

  const navLinks = (data.navLinks || []).map(l =>
    `<a href="${esc(l.url)}" class="nav-link">${esc(l.label)}</a>`
  ).join('');

  const title = esc(data.title || 'Page');
  const metaDesc = esc(data.metaDescription || data.subtitle || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${esc(data.subtitle || '')}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${getStyles(accent)}
    .page-nav .nav-links-row { display: flex; gap: 8px; }
    .page-nav .nav-links-row .nav-link { padding: 6px 16px; border-radius: 8px; }
    .page-nav .nav-links-row .nav-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
  </style>
</head>
<body>
  <nav class="page-nav">
    <div class="container">
      <a href="/" class="brand">${esc(data.title || 'Hossam Gamal')}</a>
      ${navLinks ? `<div class="nav-links-row">${navLinks}</div>` : ''}
    </div>
  </nav>

  <section class="home-hero">
    <div class="container">
      <div class="home-hero-inner">
        ${data.profileImage ? `
          <div class="home-photo-wrap">
            <img src="${esc(data.profileImage)}" alt="${esc(data.title)}" class="home-photo">
          </div>` : ''}
        <div>
          <h1>${esc(data.title)}</h1>
          ${data.subtitle ? `<p class="subtitle">${esc(data.subtitle)}</p>` : ''}
          ${socials ? `<div class="home-socials">${socials}</div>` : ''}
        </div>
      </div>
    </div>
  </section>

  ${projects ? `
  <section class="home-projects">
    <div class="container">
      <h2>${esc(data.projectsTitle || 'Featured Projects')}</h2>
      <p class="section-sub">${esc(data.projectsSubtitle || 'Apps and creative work I\'m proud of')}</p>
      <div class="home-grid">${projects}</div>
    </div>
  </section>` : ''}

  <footer class="page-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${esc(data.title || 'Hossam Gamal')}</p>
    </div>
  </footer>
</body>
</html>`;
}

function renderAppShowcase(data, accent) {
  const features = (data.features || []).map(f => `
    <div class="feature-card">
      <span class="feature-icon">${esc(f.emoji)}</span>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.description)}</p>
    </div>`).join('');

  const buttons = [];
  if (data.playStoreUrl) buttons.push(`<a href="${esc(data.playStoreUrl)}" class="btn btn-primary" target="_blank" rel="noopener">▶ Google Play</a>`);
  if (data.appStoreUrl) buttons.push(`<a href="${esc(data.appStoreUrl)}" class="btn btn-secondary" target="_blank" rel="noopener">🍎 App Store</a>`);

  return wrapHTML(`
    <section class="app-hero">
      <div class="container">
        ${data.emoji ? `<span class="app-icon">${esc(data.emoji)}</span>` : ''}
        <h1>${esc(data.title)}</h1>
        ${data.subtitle ? `<p class="subtitle">${esc(data.subtitle)}</p>` : ''}
        ${data.description ? `<p class="description">${esc(data.description)}</p>` : ''}
        ${buttons.length ? `<div class="download-buttons">${buttons.join('')}</div>` : ''}
      </div>
    </section>
    ${features ? `<section class="features"><div class="container"><div class="features-grid">${features}</div></div></section>` : ''}
    ${data.showDeveloperCredit !== false ? `<div class="dev-credit"><div class="container"><p>Developed by <a href="/">Hossam Gamal</a></p></div></div>` : ''}
  `, data, accent);
}

function renderLanding(data, accent) {
  const sections = (data.sections || []).map(s => {
    if (s.type === 'features') {
      const items = (s.items || []).map(f => `
        <div class="feature-card">
          <span class="feature-icon">${esc(f.emoji)}</span>
          <h3>${esc(f.title)}</h3>
          <p>${esc(f.description)}</p>
        </div>`).join('');
      return `<section class="section"><div class="container">
        <div class="section-header"><h2>${esc(s.title)}</h2>${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ''}</div>
        <div class="features-grid">${items}</div>
      </div></section>`;
    }
    if (s.type === 'cta') {
      return `<section class="cta-section"><div class="container">
        <h2>${esc(s.title)}</h2>
        ${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ''}
        ${s.buttonText ? `<a href="${esc(s.buttonUrl || '#')}" class="btn btn-primary" target="_blank" rel="noopener">${esc(s.buttonText)}</a>` : ''}
      </div></section>`;
    }
    // Default: text section
    return `<section class="section"><div class="container">
      <div class="section-header"><h2>${esc(s.title)}</h2></div>
      <div class="content-block"><p>${esc(s.content)}</p></div>
    </div></section>`;
  }).join('');

  return wrapHTML(`
    <section class="landing-hero">
      <div class="container">
        <h1>${esc(data.title)}</h1>
        ${data.subtitle ? `<p class="subtitle">${esc(data.subtitle)}</p>` : ''}
        ${data.ctaText ? `<a href="${esc(data.ctaUrl || '#')}" class="btn btn-primary" target="_blank" rel="noopener">${esc(data.ctaText)}</a>` : ''}
      </div>
    </section>
    ${sections}
    ${data.showDeveloperCredit !== false ? `<div class="dev-credit"><div class="container"><p>Developed by <a href="/">Hossam Gamal</a></p></div></div>` : ''}
  `, data, accent);
}

function renderPortfolio(data, accent) {
  const tags = (data.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const links = [];
  if (data.liveUrl) links.push(`<a href="${esc(data.liveUrl)}" class="btn btn-primary" target="_blank" rel="noopener">🔗 Live Demo</a>`);
  if (data.sourceUrl) links.push(`<a href="${esc(data.sourceUrl)}" class="btn btn-secondary" target="_blank" rel="noopener">📂 Source Code</a>`);

  const gallery = (data.screenshots || []).filter(s => s).map(s =>
    `<img src="${esc(s)}" alt="Screenshot" loading="lazy">`
  ).join('');

  return wrapHTML(`
    <section class="project-hero">
      <div class="container">
        <h1>${esc(data.title)}</h1>
        ${data.subtitle ? `<p class="subtitle">${esc(data.subtitle)}</p>` : ''}
        ${data.description ? `<p class="description">${esc(data.description)}</p>` : ''}
        ${links.length ? `<div class="project-links">${links.join('')}</div>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
    </section>
    ${gallery ? `<section class="gallery"><div class="container"><div class="gallery-grid">${gallery}</div></div></section>` : ''}
    ${data.showDeveloperCredit !== false ? `<div class="dev-credit"><div class="container"><p>Developed by <a href="/">Hossam Gamal</a></p></div></div>` : ''}
  `, data, accent);
}

function renderArticle(data, accent) {
  const tags = (data.tags || []).map(t => `<span class="article-tag">${esc(t)}</span>`).join('');
  const meta = [];
  if (data.author) meta.push(`<span>By ${esc(data.author)}</span>`);
  if (data.date) meta.push(`<span>${esc(data.date)}</span>`);

  // Simple markdown-like rendering for article body
  const body = (data.content || '')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .split('\n\n').map(p => {
      p = p.trim();
      if (!p || p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<li')) return p;
      if (p.includes('<li>')) return `<ul>${p}</ul>`;
      return `<p>${p}</p>`;
    }).join('\n');

  return wrapHTML(`
    <header class="article-header">
      <div class="container">
        ${meta.length ? `<div class="article-meta">${meta.join('')}</div>` : ''}
        <h1>${esc(data.title)}</h1>
        ${tags ? `<div class="article-tags">${tags}</div>` : ''}
      </div>
    </header>
    ${data.coverImage ? `<div class="article-cover"><div class="container"><img src="${esc(data.coverImage)}" alt="Cover"></div></div>` : ''}
    <article class="article-body">
      ${body}
    </article>
    ${data.showDeveloperCredit !== false ? `<div class="dev-credit"><div class="container"><p>By <a href="/">Hossam Gamal</a></p></div></div>` : ''}
  `, data, accent);
}

export function renderPage(data) {
  const accent = data.accentColor || '#0f987f';
  switch (data.template) {
    case 'homepage': return renderHomepage(data, accent);
    case 'app-showcase': return renderAppShowcase(data, accent);
    case 'landing': return renderLanding(data, accent);
    case 'portfolio': return renderPortfolio(data, accent);
    case 'article': return renderArticle(data, accent);
    default: return renderAppShowcase(data, accent);
  }
}

export function getTemplateFields(template) {
  const common = ['title', 'subtitle', 'metaDescription', 'accentColor', 'showDeveloperCredit'];
  switch (template) {
    case 'homepage':
      return [...common, 'profileImage', 'projectsTitle', 'projectsSubtitle', 'socialLinks', 'projects', 'navLinks'];
    case 'app-showcase':
      return [...common, 'emoji', 'description', 'playStoreUrl', 'appStoreUrl', 'features', 'navLinks'];
    case 'landing':
      return [...common, 'ctaText', 'ctaUrl', 'sections', 'navLinks'];
    case 'portfolio':
      return [...common, 'description', 'liveUrl', 'sourceUrl', 'tags', 'screenshots', 'navLinks'];
    case 'article':
      return [...common, 'author', 'date', 'coverImage', 'content', 'tags', 'navLinks'];
    default:
      return common;
  }
}
