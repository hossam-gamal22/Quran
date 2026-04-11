// Admin Panel — Main Application Logic
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { renderPage, TEMPLATES, getTemplateFields } from '../shared/renderer.js';

// ——— Firebase Init ———
const app = initializeApp({
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
});
const db = getFirestore(app);

// ——— State ———
let currentView = 'pages';
let currentPage = null;
let allPages = [];
let previewTimer = null;

// ——— Password Hashing ———
async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ——— Auth ———
const PW_KEY = 'admin_pw_hash';

async function checkAuth() {
  const session = sessionStorage.getItem('admin_auth');
  if (session === 'true') {
    showDashboard();
    return;
  }
  const storedHash = localStorage.getItem(PW_KEY);
  if (!storedHash) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
  }
}

async function handleLogin() {
  const pw = document.getElementById('password-input').value;
  if (!pw) return;
  const hash = await hashPassword(pw);
  const storedHash = localStorage.getItem(PW_KEY);
  if (storedHash && storedHash === hash) {
    sessionStorage.setItem('admin_auth', 'true');
    showDashboard();
  } else {
    showToast('Incorrect password', 'error');
  }
}

async function handleSetup() {
  const pw = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-confirm').value;
  if (!pw || pw.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  if (pw !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  const hash = await hashPassword(pw);
  localStorage.setItem(PW_KEY, hash);
  sessionStorage.setItem('admin_auth', 'true');
  showDashboard();
  showToast('Password set successfully!', 'success');
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

// ——— Dashboard ———
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  seedExistingPages().then(() => {
    loadPages();
    renderTemplateGrid();
  });
}

// ——— Seed existing pages ———
async function seedExistingPages() {
  const NAV_LINKS = [
    { label: 'Home', url: '/' },
    { label: 'Rooh Al-Muslim', url: '/rooh-almuslim.html' }
  ];

  const SEED_PAGES = {
    'home': {
      template: 'homepage',
      title: 'Hossam Gamal',
      subtitle: 'Mobile Developer & Creative Designer',
      slug: 'home',
      accentColor: '#0f987f',
      published: true,
      metaDescription: 'Hossam Gamal — Mobile Developer, UI/UX Designer, and Creative Director.',
      profileImage: '/images/profile.jpg',
      projectsTitle: 'Featured Projects',
      projectsSubtitle: 'Apps and creative work I\'m proud of',
      showDeveloperCredit: true,
      navLinks: NAV_LINKS,
      socialLinks: [
        { platform: 'linkedin', url: 'https://www.linkedin.com/in/hossamgamal22/' },
        { platform: 'instagram', url: 'https://www.instagram.com/hossam_gamal22/' },
        { platform: 'facebook', url: 'https://www.facebook.com/HossamGamal59/' },
        { platform: 'behance', url: 'https://www.behance.net/HossamGamal1' },
        { platform: 'vimeo', url: 'https://vimeo.com/hossamgamal1' }
      ],
      projects: [
        { emoji: '🕌', title: 'Rooh Al-Muslim', description: 'A comprehensive Islamic app with Quran, Azkar, Prayer times, Tasbih, and more.', url: '/rooh-almuslim.html' }
      ]
    },
    'rooh-almuslim': {
      template: 'app-showcase',
      title: 'Rooh Al-Muslim',
      subtitle: 'Your Complete Islamic Companion',
      slug: 'rooh-almuslim',
      emoji: '🕌',
      accentColor: '#0f987f',
      published: true,
      metaDescription: 'Rooh Al-Muslim — A comprehensive Islamic app: Quran, Azkar, Prayer times, Tasbih, Duas, and more.',
      description: 'Everything a Muslim needs in one beautifully designed app — Quran with Uthmani script, Azkar, Prayer times, Qibla, Tasbih, Duas, Hijri Calendar, and much more.',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
      appStoreUrl: '',
      showDeveloperCredit: true,
      navLinks: NAV_LINKS,
      features: [
        { emoji: '📖', title: 'Holy Quran', description: 'High-quality Uthmani script Mushaf with Tafsir, translation, and audio recitation.' },
        { emoji: '📿', title: 'Azkar & Duas', description: 'Morning, evening, and sleep azkar with diverse duas, audio playback, and auto-counting.' },
        { emoji: '🕌', title: 'Prayer Times', description: 'Accurate prayer times with adhan alerts, Qibla direction, and countdown timer.' },
        { emoji: '🤲', title: 'Tasbih Counter', description: 'Digital tasbih with daily tracking, detailed statistics, and worship history.' },
        { emoji: '🗓️', title: 'Hijri Calendar', description: 'Hijri and Gregorian calendar with Islamic events and holidays.' },
        { emoji: '🕋', title: 'Hajj & Umrah', description: 'Complete step-by-step guide for Hajj and Umrah rituals with duas.' }
      ]
    }
  };

  for (const [id, data] of Object.entries(SEED_PAGES)) {
    try {
      const snap = await getDoc(doc(db, 'websitePages', id));
      if (!snap.exists()) {
        await setDoc(doc(db, 'websitePages', id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        console.log(`Seeded page: ${id}`);
      }
    } catch (e) {
      console.error(`Failed to seed ${id}:`, e);
      if (e.code === 'permission-denied') {
        showToast('Firestore rules are blocking access. Please update rules in Firebase Console.', 'error');
        return;
      }
    }
  }
}

// ——— View Routing ———
window.switchView = function(view) {
  currentView = view;
  ['pages', 'create', 'editor', 'ads', 'domains', 'settings'].forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) v === view ? el.classList.remove('hidden') : el.classList.add('hidden');
  });

  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  if (view === 'pages') loadPages();
  if (view === 'ads') loadAdsEntries();
};

// ——— Pages CRUD ———
async function loadPages() {
  try {
    const snap = await getDocs(collection(db, 'websitePages'));
    allPages = [];
    snap.forEach(d => allPages.push({ id: d.id, ...d.data() }));
    allPages.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    renderPagesList();
  } catch (e) {
    console.error('loadPages error:', e);
    showToast('Failed to load pages: ' + e.message, 'error');
  }
}

function renderPagesList() {
  const container = document.getElementById('pages-list');
  if (!allPages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📄</span>
        <h3>No pages yet</h3>
        <p>Create your first page to get started.</p>
        <button class="btn-admin btn-primary-admin" onclick="switchView('create')">➕ Create Page</button>
      </div>`;
    return;
  }

  container.innerHTML = allPages.map(p => {
    const tpl = TEMPLATES[p.template] || TEMPLATES['app-showcase'];
    const status = p.published ? 'published' : 'draft';
    const statusLabel = p.published ? 'Published' : 'Draft';
    const isCore = p.id === 'home' || p.id === 'rooh-almuslim';
    const url = p.id === 'home' ? '/' : p.id === 'rooh-almuslim' ? '/rooh-almuslim.html' : `/p/${p.slug}`;
    return `
      <div class="page-card">
        <span class="page-emoji">${p.emoji || tpl.icon}</span>
        <div class="page-info">
          <div class="page-title">${esc(p.title || 'Untitled')}${isCore ? ' <span style="font-size:0.7rem;color:var(--admin-accent);font-weight:500">(Core)</span>' : ''}</div>
          <div class="page-meta">
            <span class="status-badge status-${status}">${statusLabel}</span>
            <span>${tpl.name}</span>
            <span><a href="${url}" target="_blank" rel="noopener" style="color:var(--admin-accent)">${url}</a></span>
          </div>
        </div>
        <div class="page-actions">
          <button class="btn-icon" title="Edit" onclick="editPage('${p.id}')">✏️</button>
          <button class="btn-icon" title="Duplicate" onclick="duplicatePage('${p.id}')">📋</button>
          ${isCore ? '' : `<button class="btn-icon" title="Delete" onclick="deletePage('${p.id}')">🗑️</button>`}
        </div>
      </div>`;
  }).join('');
}

window.editPage = function(id) {
  const page = allPages.find(p => p.id === id);
  if (!page) return;
  currentPage = { ...page };
  openEditor();
};

window.duplicatePage = async function(id) {
  const page = allPages.find(p => p.id === id);
  if (!page) return;
  const newSlug = page.slug + '-copy-' + Date.now().toString(36);
  const newPage = { ...page, slug: newSlug, title: page.title + ' (Copy)', published: false };
  delete newPage.id;
  try {
    await setDoc(doc(db, 'websitePages', newSlug), { ...newPage, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    showToast('Page duplicated', 'success');
    loadPages();
  } catch {
    showToast('Failed to duplicate', 'error');
  }
};

window.deletePage = async function(id) {
  if (!confirm('Delete this page? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'websitePages', id));
    showToast('Page deleted', 'success');
    loadPages();
  } catch {
    showToast('Failed to delete', 'error');
  }
};

window.savePage = async function() {
  if (!currentPage) return;
  collectFormData();

  if (!currentPage.slug) {
    showToast('Please enter a URL slug', 'error');
    return;
  }
  currentPage.slug = currentPage.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const data = { ...currentPage };
  delete data.id;
  data.updatedAt = serverTimestamp();
  if (!data.createdAt) data.createdAt = serverTimestamp();

  try {
    await setDoc(doc(db, 'websitePages', currentPage.slug), data);
    currentPage.id = currentPage.slug;
    showToast('Page saved!', 'success');
    document.getElementById('editor-title').textContent = currentPage.title || 'Edit Page';
  } catch {
    showToast('Failed to save', 'error');
  }
};

window.togglePublish = function() {
  if (!currentPage) return;
  currentPage.published = !currentPage.published;
  const toggle = document.getElementById('publish-toggle');
  const label = document.getElementById('publish-label');
  toggle.classList.toggle('active', currentPage.published);
  label.textContent = currentPage.published ? 'Published' : 'Draft';
};

window.openPreview = function() {
  if (!currentPage) return;
  collectFormData();
  const html = renderPage(currentPage);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

// ——— Template Grid ———
function renderTemplateGrid() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = Object.entries(TEMPLATES).map(([key, tpl]) => `
    <div class="template-card" onclick="createFromTemplate('${key}')">
      <span class="tpl-icon">${tpl.icon}</span>
      <h3>${tpl.name}</h3>
      <p>${tpl.description}</p>
    </div>
  `).join('');
}

window.createFromTemplate = function(templateKey) {
  currentPage = {
    template: templateKey,
    title: '',
    subtitle: '',
    slug: '',
    accentColor: '#0f987f',
    published: false,
    showDeveloperCredit: true,
    emoji: templateKey === 'app-showcase' ? '🕌' : '',
    description: '',
    metaDescription: '',
    navLinks: [],
    playStoreUrl: '',
    appStoreUrl: '',
    features: [],
    ctaText: '',
    ctaUrl: '',
    sections: [],
    liveUrl: '',
    sourceUrl: '',
    tags: [],
    screenshots: [],
    author: 'Hossam Gamal',
    date: new Date().toISOString().split('T')[0],
    coverImage: '',
    content: '',
    profileImage: '',
    socialLinks: [],
    projects: [],
    projectsTitle: 'Featured Projects',
    projectsSubtitle: '',
  };
  openEditor();
};

// ——— Editor ———
function openEditor() {
  switchView('editor');
  document.getElementById('editor-title').textContent = currentPage.title || 'New Page';
  const toggle = document.getElementById('publish-toggle');
  const label = document.getElementById('publish-label');
  toggle.classList.toggle('active', currentPage.published);
  label.textContent = currentPage.published ? 'Published' : 'Draft';
  buildEditorForm();
  updatePreview();
}

function buildEditorForm() {
  const form = document.getElementById('editor-form');
  const tpl = currentPage.template;
  let html = '';

  // Common fields
  html += `<div class="section-title">Basic Info</div>`;
  html += formField('Slug (URL)', 'slug', currentPage.slug, 'text', 'e.g., my-app');
  html += formField('Title', 'title', currentPage.title, 'text', 'Page title');
  html += formField('Subtitle', 'subtitle', currentPage.subtitle, 'text', 'Short tagline');
  html += formField('Meta Description', 'metaDescription', currentPage.metaDescription, 'text', 'SEO description');
  html += colorField('Accent Color', 'accentColor', currentPage.accentColor);

  html += `<div class="toggle-group" style="margin-bottom:20px">
    <button class="toggle ${currentPage.showDeveloperCredit ? 'active' : ''}" id="toggle-credit" onclick="toggleField('showDeveloperCredit', 'toggle-credit')"></button>
    <span class="toggle-label">Show developer credit</span>
  </div>`;

  html += `<div class="divider"></div>`;

  // Template-specific fields
  if (tpl === 'app-showcase') {
    html += `<div class="section-title">App Showcase</div>`;
    html += formField('Emoji / Icon', 'emoji', currentPage.emoji, 'text', '📱 🕌 🎮');
    html += formArea('Description', 'description', currentPage.description, 'Describe your app...');
    html += formField('Play Store URL', 'playStoreUrl', currentPage.playStoreUrl, 'url', 'https://play.google.com/...');
    html += formField('App Store URL', 'appStoreUrl', currentPage.appStoreUrl, 'url', 'https://apps.apple.com/...');
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Features</div>`;
    html += renderFeaturesList(currentPage.features);
  }

  if (tpl === 'landing') {
    html += `<div class="section-title">Hero CTA</div>`;
    html += `<div class="form-row">`;
    html += formField('CTA Button Text', 'ctaText', currentPage.ctaText, 'text', 'Get Started');
    html += formField('CTA Button URL', 'ctaUrl', currentPage.ctaUrl, 'url', 'https://...');
    html += `</div>`;
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Sections</div>`;
    html += renderSectionsList(currentPage.sections);
  }

  if (tpl === 'portfolio') {
    html += `<div class="section-title">Project Details</div>`;
    html += formArea('Description', 'description', currentPage.description, 'Describe the project...');
    html += `<div class="form-row">`;
    html += formField('Live Demo URL', 'liveUrl', currentPage.liveUrl, 'url', 'https://...');
    html += formField('Source Code URL', 'sourceUrl', currentPage.sourceUrl, 'url', 'https://github.com/...');
    html += `</div>`;
    html += formField('Tags (comma-separated)', 'tags', (currentPage.tags || []).join(', '), 'text', 'React, TypeScript, Firebase');
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Screenshots</div>`;
    html += renderScreenshotsList(currentPage.screenshots);
  }

  if (tpl === 'article') {
    html += `<div class="section-title">Article</div>`;
    html += `<div class="form-row">`;
    html += formField('Author', 'author', currentPage.author, 'text', 'Your name');
    html += formField('Date', 'date', currentPage.date, 'date', '');
    html += `</div>`;
    html += formField('Cover Image URL', 'coverImage', currentPage.coverImage, 'url', 'https://...');
    html += formField('Tags (comma-separated)', 'tags', (currentPage.tags || []).join(', '), 'text', 'Tech, Design, Tutorial');
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Content</div>`;
    html += `<p style="color:var(--admin-text-muted);font-size:0.8rem;margin-bottom:8px">Supports basic Markdown: **bold**, *italic*, ## headings, > quotes, - lists</p>`;
    html += formArea('Body', 'content', currentPage.content, 'Write your article...', 300);
  }

  if (tpl === 'homepage') {
    html += `<div class="section-title">Profile</div>`;
    html += formField('Profile Image URL', 'profileImage', currentPage.profileImage, 'text', '/images/profile.jpg or https://...');
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Social Links</div>`;
    html += renderSocialLinksList(currentPage.socialLinks);
    html += `<div class="divider"></div>`;
    html += `<div class="section-title">Projects</div>`;
    html += formField('Projects Section Title', 'projectsTitle', currentPage.projectsTitle, 'text', 'Featured Projects');
    html += formField('Projects Section Subtitle', 'projectsSubtitle', currentPage.projectsSubtitle, 'text', 'Apps and work I\'m proud of');
    html += renderProjectsList(currentPage.projects);
  }

  // Nav Links (all templates)
  html += `<div class="divider"></div>`;
  html += `<div class="section-title">Navigation Links</div>`;
  html += renderNavLinksList(currentPage.navLinks);

  form.innerHTML = html;

  // Bind input events for live preview
  form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        collectFormData();
        updatePreview();
      }, 350);
    });
  });
}

// ——— Form Helpers ———
function formField(label, name, value, type, placeholder) {
  return `<div class="form-group">
    <label>${esc(label)}</label>
    <input class="form-input" data-field="${name}" type="${type}" value="${esc(value || '')}" placeholder="${esc(placeholder)}">
  </div>`;
}

function formArea(label, name, value, placeholder, minH) {
  return `<div class="form-group">
    <label>${esc(label)}</label>
    <textarea class="form-textarea" data-field="${name}" placeholder="${esc(placeholder)}"${minH ? ` style="min-height:${minH}px"` : ''}>${esc(value || '')}</textarea>
  </div>`;
}

function colorField(label, name, value) {
  return `<div class="form-group">
    <label>${esc(label)}</label>
    <div class="inline-color">
      <input class="form-input" data-field="${name}" type="text" value="${esc(value || '#0f987f')}" placeholder="#0f987f">
      <div class="color-preview"><input type="color" value="${value || '#0f987f'}" onchange="this.parentElement.previousElementSibling.value=this.value;this.parentElement.previousElementSibling.dispatchEvent(new Event('input'))"></div>
    </div>
  </div>`;
}

// ——— Dynamic List Renderers ———
function renderFeaturesList(features) {
  let html = '<div class="field-list" id="features-list">';
  (features || []).forEach((f, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs">
        <input class="form-input" data-list="features" data-index="${i}" data-key="emoji" value="${esc(f.emoji)}" placeholder="Emoji (📱)">
        <input class="form-input" data-list="features" data-index="${i}" data-key="title" value="${esc(f.title)}" placeholder="Feature title">
        <textarea class="form-textarea" data-list="features" data-index="${i}" data-key="description" placeholder="Feature description" style="min-height:60px">${esc(f.description)}</textarea>
      </div>
      <button class="remove-btn" onclick="removeListItem('features', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addFeature()">+ Add Feature</button>`;
  return html;
}

function renderSectionsList(sections) {
  let html = '<div class="field-list" id="sections-list">';
  (sections || []).forEach((s, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs">
        <select class="form-select" data-list="sections" data-index="${i}" data-key="type">
          <option value="text" ${s.type === 'text' ? 'selected' : ''}>Text Section</option>
          <option value="features" ${s.type === 'features' ? 'selected' : ''}>Features Grid</option>
          <option value="cta" ${s.type === 'cta' ? 'selected' : ''}>Call to Action</option>
        </select>
        <input class="form-input" data-list="sections" data-index="${i}" data-key="title" value="${esc(s.title)}" placeholder="Section title">
        <textarea class="form-textarea" data-list="sections" data-index="${i}" data-key="content" placeholder="Section content" style="min-height:60px">${esc(s.content || s.subtitle || '')}</textarea>
        ${s.type === 'cta' ? `
          <input class="form-input" data-list="sections" data-index="${i}" data-key="buttonText" value="${esc(s.buttonText || '')}" placeholder="Button text">
          <input class="form-input" data-list="sections" data-index="${i}" data-key="buttonUrl" value="${esc(s.buttonUrl || '')}" placeholder="Button URL">
        ` : ''}
      </div>
      <button class="remove-btn" onclick="removeListItem('sections', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addSection()">+ Add Section</button>`;
  return html;
}

function renderScreenshotsList(screenshots) {
  let html = '<div class="field-list" id="screenshots-list">';
  (screenshots || []).forEach((url, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs">
        <input class="form-input" data-list="screenshots" data-index="${i}" data-key="url" value="${esc(url)}" placeholder="Image URL (https://...)">
      </div>
      <button class="remove-btn" onclick="removeListItem('screenshots', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addScreenshot()">+ Add Screenshot</button>`;
  return html;
}

function renderSocialLinksList(links) {
  const PLATFORMS = ['linkedin', 'instagram', 'facebook', 'twitter', 'github', 'behance', 'dribbble', 'youtube', 'vimeo', 'website'];
  let html = '<div class="field-list" id="socialLinks-list">';
  (links || []).forEach((l, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs">
        <select class="form-select" data-list="socialLinks" data-index="${i}" data-key="platform">
          ${PLATFORMS.map(p => `<option value="${p}" ${l.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <input class="form-input" data-list="socialLinks" data-index="${i}" data-key="url" value="${esc(l.url)}" placeholder="https://...">
      </div>
      <button class="remove-btn" onclick="removeListItem('socialLinks', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addSocialLink()">+ Add Social Link</button>`;
  return html;
}

function renderProjectsList(projects) {
  let html = '<div class="field-list" id="projects-list">';
  (projects || []).forEach((p, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs">
        <input class="form-input" data-list="projects" data-index="${i}" data-key="emoji" value="${esc(p.emoji)}" placeholder="Emoji (🕌)">
        <input class="form-input" data-list="projects" data-index="${i}" data-key="title" value="${esc(p.title)}" placeholder="Project title">
        <textarea class="form-textarea" data-list="projects" data-index="${i}" data-key="description" placeholder="Short description" style="min-height:60px">${esc(p.description)}</textarea>
        <input class="form-input" data-list="projects" data-index="${i}" data-key="url" value="${esc(p.url)}" placeholder="Link URL (optional)">
      </div>
      <button class="remove-btn" onclick="removeListItem('projects', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addProject()">+ Add Project</button>`;
  return html;
}

function renderNavLinksList(links) {
  let html = '<div class="field-list" id="navLinks-list">';
  (links || []).forEach((l, i) => {
    html += `<div class="field-list-item" data-index="${i}">
      <div class="field-inputs" style="flex-direction:row;gap:8px">
        <input class="form-input" data-list="navLinks" data-index="${i}" data-key="label" value="${esc(l.label)}" placeholder="Label" style="flex:1">
        <input class="form-input" data-list="navLinks" data-index="${i}" data-key="url" value="${esc(l.url)}" placeholder="URL" style="flex:2">
      </div>
      <button class="remove-btn" onclick="removeListItem('navLinks', ${i})">✕</button>
    </div>`;
  });
  html += '</div>';
  html += `<button class="add-field-btn" onclick="addNavLink()">+ Add Nav Link</button>`;
  return html;
}

// ——— Dynamic List Actions ———
window.addFeature = function() {
  collectFormData();
  currentPage.features = currentPage.features || [];
  currentPage.features.push({ emoji: '', title: '', description: '' });
  buildEditorForm();
  updatePreview();
};

window.addSection = function() {
  collectFormData();
  currentPage.sections = currentPage.sections || [];
  currentPage.sections.push({ type: 'text', title: '', content: '' });
  buildEditorForm();
  updatePreview();
};

window.addScreenshot = function() {
  collectFormData();
  currentPage.screenshots = currentPage.screenshots || [];
  currentPage.screenshots.push('');
  buildEditorForm();
  updatePreview();
};

window.addSocialLink = function() {
  collectFormData();
  currentPage.socialLinks = currentPage.socialLinks || [];
  currentPage.socialLinks.push({ platform: 'linkedin', url: '' });
  buildEditorForm();
  updatePreview();
};

window.addProject = function() {
  collectFormData();
  currentPage.projects = currentPage.projects || [];
  currentPage.projects.push({ emoji: '', title: '', description: '', url: '' });
  buildEditorForm();
  updatePreview();
};

window.addNavLink = function() {
  collectFormData();
  currentPage.navLinks = currentPage.navLinks || [];
  currentPage.navLinks.push({ label: '', url: '' });
  buildEditorForm();
  updatePreview();
};

window.removeListItem = function(list, index) {
  collectFormData();
  if (currentPage[list]) {
    currentPage[list].splice(index, 1);
  }
  buildEditorForm();
  updatePreview();
};

window.toggleField = function(field, toggleId) {
  currentPage[field] = !currentPage[field];
  const el = document.getElementById(toggleId);
  el.classList.toggle('active', currentPage[field]);
};

// ——— Collect Form Data ———
function collectFormData() {
  if (!currentPage) return;
  const form = document.getElementById('editor-form');

  // Simple fields
  form.querySelectorAll('[data-field]').forEach(el => {
    currentPage[el.dataset.field] = el.value;
  });

  // Parse tags
  if (currentPage.template === 'portfolio' || currentPage.template === 'article') {
    const tagsEl = form.querySelector('[data-field="tags"]');
    if (tagsEl) {
      currentPage.tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  // Features list
  if (currentPage.template === 'app-showcase') {
    const featureEls = form.querySelectorAll('[data-list="features"]');
    const features = {};
    featureEls.forEach(el => {
      const idx = parseInt(el.dataset.index);
      if (!features[idx]) features[idx] = {};
      features[idx][el.dataset.key] = el.value;
    });
    currentPage.features = Object.values(features);
  }

  // Sections list
  if (currentPage.template === 'landing') {
    const sectionEls = form.querySelectorAll('[data-list="sections"]');
    const sections = {};
    sectionEls.forEach(el => {
      const idx = parseInt(el.dataset.index);
      if (!sections[idx]) sections[idx] = {};
      sections[idx][el.dataset.key] = el.value;
    });
    currentPage.sections = Object.values(sections);
  }

  // Screenshots list
  if (currentPage.template === 'portfolio') {
    const ssEls = form.querySelectorAll('[data-list="screenshots"]');
    const screenshots = [];
    ssEls.forEach(el => { screenshots[parseInt(el.dataset.index)] = el.value; });
    currentPage.screenshots = screenshots.filter(s => s !== undefined);
  }

  // Social links + projects (homepage)
  if (currentPage.template === 'homepage') {
    const slEls = form.querySelectorAll('[data-list="socialLinks"]');
    const socialLinks = {};
    slEls.forEach(el => {
      const idx = parseInt(el.dataset.index);
      if (!socialLinks[idx]) socialLinks[idx] = {};
      socialLinks[idx][el.dataset.key] = el.value;
    });
    currentPage.socialLinks = Object.values(socialLinks);

    const projEls = form.querySelectorAll('[data-list="projects"]');
    const projects = {};
    projEls.forEach(el => {
      const idx = parseInt(el.dataset.index);
      if (!projects[idx]) projects[idx] = {};
      projects[idx][el.dataset.key] = el.value;
    });
    currentPage.projects = Object.values(projects);
  }

  // Nav links (all templates)
  const navEls = form.querySelectorAll('[data-list="navLinks"]');
  if (navEls.length > 0) {
    const navLinks = {};
    navEls.forEach(el => {
      const idx = parseInt(el.dataset.index);
      if (!navLinks[idx]) navLinks[idx] = {};
      navLinks[idx][el.dataset.key] = el.value;
    });
    currentPage.navLinks = Object.values(navLinks);
  }
}

// ——— Preview ———
function updatePreview() {
  if (!currentPage) return;
  try {
    const html = renderPage(currentPage);
    const frame = document.getElementById('preview-frame');
    frame.srcdoc = html;
  } catch (e) {
    console.error('Preview error:', e);
  }
}

// ——— Settings ———
async function handleChangePassword() {
  const curr = document.getElementById('current-pw').value;
  const newPw = document.getElementById('new-pw').value;
  const confirmPw = document.getElementById('confirm-pw').value;
  if (!curr || !newPw) return;
  if (newPw.length < 6) {
    showToast('New password must be at least 6 characters', 'error');
    return;
  }
  if (newPw !== confirmPw) {
    showToast('New passwords do not match', 'error');
    return;
  }
  const currHash = await hashPassword(curr);
  const storedHash = localStorage.getItem(PW_KEY);
  if (storedHash !== currHash) {
    showToast('Current password is incorrect', 'error');
    return;
  }
  const newHash = await hashPassword(newPw);
  localStorage.setItem(PW_KEY, newHash);
  showToast('Password updated!', 'success');
  document.getElementById('current-pw').value = '';
  document.getElementById('new-pw').value = '';
  document.getElementById('confirm-pw').value = '';
}

async function exportPages() {
  try {
    const snap = await getDocs(collection(db, 'websitePages'));
    const pages = [];
    snap.forEach(d => pages.push({ id: d.id, ...d.data() }));
    const json = JSON.stringify(pages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pages-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export complete', 'success');
  } catch {
    showToast('Export failed', 'error');
  }
}

async function importPages(file) {
  try {
    const text = await file.text();
    const pages = JSON.parse(text);
    if (!Array.isArray(pages)) throw new Error('Invalid format');
    for (const page of pages) {
      const id = page.id || page.slug;
      if (!id) continue;
      const data = { ...page };
      delete data.id;
      data.updatedAt = serverTimestamp();
      await setDoc(doc(db, 'websitePages', id), data);
    }
    showToast(`Imported ${pages.length} pages`, 'success');
    loadPages();
  } catch {
    showToast('Import failed — invalid JSON file', 'error');
  }
}

// ——— Ads.txt Management (Per-App Groups) ———
let adsApps = [];

const DEFAULT_ADS_APPS = [
  {
    appName: 'Rooh Al-Muslim',
    entries: [
      { domain: 'google.com', publisherId: 'pub-3645278220050673', relationship: 'DIRECT', certificationId: 'f08c47fec0942fa0' }
    ]
  }
];

async function loadAdsEntries() {
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'adsTxt'));
    if (snap.exists()) {
      const data = snap.data();
      // Support both old flat format and new grouped format
      if (data.apps && Array.isArray(data.apps)) {
        adsApps = data.apps;
      } else if (data.entries && Array.isArray(data.entries)) {
        // Migrate old flat entries into a single app group
        adsApps = [{ appName: 'Default', entries: data.entries }];
      } else {
        adsApps = JSON.parse(JSON.stringify(DEFAULT_ADS_APPS));
      }
    } else {
      adsApps = JSON.parse(JSON.stringify(DEFAULT_ADS_APPS));
    }
  } catch (e) {
    console.error('Failed to load ads entries:', e);
    adsApps = JSON.parse(JSON.stringify(DEFAULT_ADS_APPS));
  }
  renderAdsApps();
}

function renderAdsApps() {
  const container = document.getElementById('ads-apps-container');
  if (!container) return;

  if (!adsApps.length) {
    container.innerHTML = '<div class="domain-card"><p class="text-muted">No apps yet. Click "+ Add App" to add your first app.</p></div>';
  } else {
    container.innerHTML = adsApps.map((app, ai) => {
      let entriesHtml = '';
      if (!app.entries || !app.entries.length) {
        entriesHtml = '<p class="text-muted text-sm">No entries yet for this app.</p>';
      } else {
        entriesHtml = app.entries.map((entry, ei) => `
          <div class="field-list-item" style="margin-bottom:10px">
            <div class="field-inputs" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <input class="form-input" data-app="${ai}" data-entry="${ei}" data-key="domain" value="${esc(entry.domain)}" placeholder="Domain (e.g. google.com)">
              <input class="form-input" data-app="${ai}" data-entry="${ei}" data-key="publisherId" value="${esc(entry.publisherId)}" placeholder="Publisher ID (e.g. pub-123...)">
              <select class="form-select" data-app="${ai}" data-entry="${ei}" data-key="relationship" style="background:var(--admin-card);color:var(--admin-text);border:1px solid var(--admin-border);padding:10px 12px;border-radius:8px">
                <option value="DIRECT" ${entry.relationship === 'DIRECT' ? 'selected' : ''}>DIRECT</option>
                <option value="RESELLER" ${entry.relationship === 'RESELLER' ? 'selected' : ''}>RESELLER</option>
              </select>
              <input class="form-input" data-app="${ai}" data-entry="${ei}" data-key="certificationId" value="${esc(entry.certificationId || '')}" placeholder="Certification ID (optional)">
            </div>
            <button class="remove-btn" onclick="removeAdsEntry(${ai}, ${ei})" title="Remove entry">✕</button>
          </div>
        `).join('');
      }

      return `
        <div class="ads-app-group">
          <div class="ads-app-header">
            <div class="ads-app-title-row">
              <span class="ads-app-icon">📱</span>
              <input class="form-input ads-app-name" data-app-name="${ai}" value="${esc(app.appName)}" placeholder="App name (e.g. My App)">
            </div>
            <button class="remove-btn" onclick="removeAdsApp(${ai})" title="Remove app">🗑️</button>
          </div>
          <div class="ads-entries-list">
            ${entriesHtml}
          </div>
          <button class="add-field-btn" onclick="addAdsEntry(${ai})">+ Add Entry</button>
        </div>`;
    }).join('');
  }

  updateAdsPreview();

  // Bind live input for preview
  container.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      collectAdsFormData();
      updateAdsPreview();
    });
  });
}

function collectAdsFormData() {
  // Collect app names
  document.querySelectorAll('[data-app-name]').forEach(el => {
    const ai = parseInt(el.dataset.appName);
    if (adsApps[ai]) adsApps[ai].appName = el.value;
  });

  // Collect entries per app
  const appEntries = {};
  document.querySelectorAll('[data-app][data-entry]').forEach(el => {
    const ai = parseInt(el.dataset.app);
    const ei = parseInt(el.dataset.entry);
    const key = el.dataset.key;
    if (!appEntries[ai]) appEntries[ai] = {};
    if (!appEntries[ai][ei]) appEntries[ai][ei] = {};
    appEntries[ai][ei][key] = el.value;
  });

  for (const ai of Object.keys(appEntries)) {
    const idx = parseInt(ai);
    if (adsApps[idx]) {
      adsApps[idx].entries = Object.values(appEntries[ai]);
    }
  }
}

function getAdsRawContent() {
  let lines = [];
  adsApps.forEach(app => {
    if (app.appName) lines.push(`# ${app.appName}`);
    (app.entries || []).filter(e => e.domain && e.publisherId).forEach(e => {
      let line = `${e.domain}, ${e.publisherId}, ${e.relationship || 'DIRECT'}`;
      if (e.certificationId) line += `, ${e.certificationId}`;
      lines.push(line);
    });
    lines.push(''); // blank line between apps
  });
  // Remove trailing blank lines
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function updateAdsPreview() {
  const preview = document.getElementById('ads-raw-preview');
  if (!preview) return;
  const raw = getAdsRawContent();
  preview.textContent = raw || '(empty — add apps and entries above)';
}

async function saveAdsEntries() {
  collectAdsFormData();
  try {
    await setDoc(doc(db, 'appConfig', 'adsTxt'), {
      apps: adsApps,
      rawContent: getAdsRawContent(),
      updatedAt: serverTimestamp()
    });
    showToast('Ads.txt saved!', 'success');
  } catch (e) {
    console.error('Failed to save ads entries:', e);
    showToast('Failed to save: ' + e.message, 'error');
  }
}

function downloadAdsFile() {
  collectAdsFormData();
  const raw = getAdsRawContent();
  const blob = new Blob([raw + '\n'], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'app-ads.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('File downloaded', 'success');
}

window.removeAdsEntry = function(appIndex, entryIndex) {
  collectAdsFormData();
  if (adsApps[appIndex] && adsApps[appIndex].entries) {
    adsApps[appIndex].entries.splice(entryIndex, 1);
  }
  renderAdsApps();
};

window.addAdsEntry = function(appIndex) {
  collectAdsFormData();
  if (adsApps[appIndex]) {
    adsApps[appIndex].entries = adsApps[appIndex].entries || [];
    adsApps[appIndex].entries.push({ domain: '', publisherId: '', relationship: 'DIRECT', certificationId: '' });
  }
  renderAdsApps();
};

window.addAdsApp = function() {
  collectAdsFormData();
  adsApps.push({ appName: '', entries: [{ domain: 'google.com', publisherId: '', relationship: 'DIRECT', certificationId: '' }] });
  renderAdsApps();
};

window.removeAdsApp = function(appIndex) {
  if (!confirm('Remove this app and all its entries?')) return;
  collectAdsFormData();
  adsApps.splice(appIndex, 1);
  renderAdsApps();
};

// ——— Utilities ———
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ——— Event Listeners ———
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('setup-btn').addEventListener('click', handleSetup);
  document.getElementById('setup-confirm').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSetup();
  });
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Sidebar nav
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      switchView(a.dataset.view);
    });
  });

  // Settings
  document.getElementById('change-pw-btn').addEventListener('click', handleChangePassword);
  document.getElementById('export-btn').addEventListener('click', exportPages);
  document.getElementById('import-file').addEventListener('change', e => {
    if (e.target.files[0]) importPages(e.target.files[0]);
    e.target.value = '';
  });

  // Ads.txt
  document.getElementById('save-ads-btn').addEventListener('click', saveAdsEntries);
  document.getElementById('download-ads-btn').addEventListener('click', downloadAdsFile);
  document.getElementById('add-ads-app-btn').addEventListener('click', window.addAdsApp);

  // Start
  checkAuth();
});
