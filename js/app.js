/**
 * Bevel Portfolio App
 * Loads manifest.json and renders portfolio pages for GitHub Pages.
 */

const App = (() => {
  const MANIFEST_URL = 'data/manifest.json';
  const LOGO_SRC = 'css/bevel_red_white_png.png';
  const CATEGORIES = {
    'التصميم': { label: 'التصميم', icon: '✦' },
    'التنفيذ': { label: 'التنفيذ', icon: '◧' }
  };

  let manifest = null;
  let lightboxPhotos = [];
  let lightboxIndex = 0;

  async function loadManifest() {
    if (manifest) return manifest;
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error('Failed to load portfolio data');
    manifest = await res.json();
    return manifest;
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function projectUrl(category, slug) {
    return `project.html?cat=${encodeURIComponent(category)}&project=${encodeURIComponent(slug)}`;
  }

  function categoryUrl(category) {
    return `category.html?cat=${encodeURIComponent(category)}`;
  }

  function mediaUrl(category, slug, media) {
    if (media && typeof media === 'object' && media.url) {
      return media.url;
    }
    const filename = typeof media === 'string' ? media : media?.name;
    const slugParts = slug.split('/').map(encodeURIComponent).join('/');
    return `portfolio/${encodeURIComponent(category)}/${slugParts}/${encodeURIComponent(filename)}`;
  }

  function formatPhone(phone) {
    return phone.replace(/\s/g, '');
  }

  function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }

  function renderLogo(linkHome = true) {
    const inner = `<img src="${LOGO_SRC}" alt="Bevel" class="logo-img" width="120" height="40">`;
    return linkHome
      ? `<a href="index.html" class="logo">${inner}</a>`
      : `<div class="logo">${inner}</div>`;
  }

  async function initHome() {
    const logoEl = document.getElementById('site-logo');
    if (logoEl) logoEl.innerHTML = renderLogo(true);

    try {
      const data = await loadManifest();
      document.querySelectorAll('.project-count').forEach(el => {
        const cat = el.dataset.cat;
        const count = (data.categories[cat] || []).length;
        el.textContent = count === 1 ? 'مشروع واحد' : `${count} مشروع`;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function initCategory() {
    const logoEl = document.getElementById('site-logo');
    if (logoEl) logoEl.innerHTML = renderLogo(true);

    const cat = getQueryParam('cat');
    const loading = document.getElementById('loading');
    const grid = document.getElementById('project-grid');
    const empty = document.getElementById('empty-state');
    const title = document.getElementById('page-title');

    if (!cat || !CATEGORIES[cat]) {
      window.location.href = 'index.html';
      return;
    }

    title.textContent = CATEGORIES[cat].label;

    try {
      const data = await loadManifest();
      const projects = data.categories[cat] || [];

      loading.hidden = true;

      if (projects.length === 0) {
        empty.hidden = false;
        return;
      }

      grid.hidden = false;
      grid.innerHTML = projects.map(p => renderProjectCard(cat, p)).join('');
    } catch (e) {
      loading.textContent = 'حدث خطأ في تحميل البيانات';
      console.error(e);
    }
  }

  function renderProjectCard(category, project) {
    const thumb = project.thumbnail
      ? `<img src="${mediaUrl(category, project.slug, project.thumbnail)}" alt="${escapeHtml(project.name)}" loading="lazy">`
      : `<div class="project-thumb-placeholder">${CATEGORIES[category]?.icon || '◆'}</div>`;

    const subtitle = hasValue(project.description)
      ? escapeHtml(project.description)
      : '';

    return `
      <a href="${projectUrl(category, project.slug)}" class="project-card">
        <div class="project-thumb">${thumb}</div>
        <div class="project-card-body">
          <h3>${escapeHtml(project.name)}</h3>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
      </a>`;
  }

  async function initProject() {
    const logoEl = document.getElementById('site-logo');
    if (logoEl) logoEl.innerHTML = renderLogo(true);

    const cat = getQueryParam('cat');
    const slug = getQueryParam('project');
    const loading = document.getElementById('loading');
    const detail = document.getElementById('project-detail');
    const error = document.getElementById('error-state');

    if (!cat || !slug) {
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('back-link').href = categoryUrl(cat);

    try {
      const data = await loadManifest();
      const projects = data.categories[cat] || [];
      const project = projects.find(p => p.slug === slug);

      if (!project) {
        loading.hidden = true;
        error.hidden = false;
        return;
      }

      renderProjectDetail(cat, project);
      loading.hidden = true;
      detail.hidden = false;
      initLightbox();
      initVideos();
    } catch (e) {
      loading.textContent = 'حدث خطأ في تحميل البيانات';
      console.error(e);
    }
  }

  function renderProjectDetail(category, project) {
    document.getElementById('page-title').textContent = project.name;
    document.title = `${project.name} | Bevel`;

    const hero = document.getElementById('project-hero');
    if (project.thumbnail) {
      hero.innerHTML = `<img src="${mediaUrl(category, project.slug, project.thumbnail)}" alt="${escapeHtml(project.name)}">`;
    } else if (project.photos?.length) {
      hero.innerHTML = `<img src="${mediaUrl(category, project.slug, project.photos[0])}" alt="${escapeHtml(project.name)}">`;
    }

    const info = document.getElementById('info-list');
    const fields = [];

    if (hasValue(project.name)) {
      fields.push({ label: 'اسم المشروع', value: project.name });
    }
    if (hasValue(project.description)) {
      fields.push({ label: 'الوصف', value: project.description });
    }
    if (hasValue(project.siteEngineer?.name)) {
      fields.push({ label: 'مهندس الموقع', value: project.siteEngineer.name });
    }

    info.innerHTML = fields
      .map(f => `<div><dt>${f.label}</dt><dd>${escapeHtml(String(f.value))}</dd></div>`)
      .join('');

    const actions = document.getElementById('action-buttons');
    const actionItems = [];

    if (hasValue(project.locationLink)) {
      actionItems.push(`
        <a class="action-btn action-btn-location" href="${escapeHtml(project.locationLink)}"
           target="_blank" rel="noopener noreferrer">
          <span>📍</span>
          <span>الذهاب للموقع</span>
        </a>`);
    }

    if (hasValue(project.siteEngineer?.phone)) {
      const phone = formatPhone(project.siteEngineer.phone);
      const label = project.siteEngineer.name
        ? `اتصل بـ ${project.siteEngineer.name}`
        : 'اتصل بمهندس الموقع';
      actionItems.push(`
        <a class="action-btn action-btn-phone" href="tel:${escapeHtml(phone)}">
          <span>📞</span>
          <span>${escapeHtml(label)}</span>
        </a>`);
    }

    if (actionItems.length) {
      actions.innerHTML = actionItems.join('');
      actions.hidden = false;
    } else {
      actions.hidden = true;
    }

    const photos = project.photos || [];
    const photoGrid = document.getElementById('photo-grid');
    const noPhotos = document.getElementById('no-photos');

    if (photos.length) {
      lightboxPhotos = photos.map(f => mediaUrl(category, project.slug, f));
      photoGrid.innerHTML = photos.map((f, i) => `
        <button class="photo-item" data-index="${i}" aria-label="عرض الصورة ${i + 1}">
          <img src="${mediaUrl(category, project.slug, f)}" alt="" loading="lazy">
        </button>`).join('');
      noPhotos.hidden = true;
    } else {
      photoGrid.innerHTML = '';
      noPhotos.hidden = false;
    }

    const videos = project.videos || [];
    const videoList = document.getElementById('video-list');
    const noVideos = document.getElementById('no-videos');

    if (videos.length) {
      videoList.innerHTML = videos.map((v, i) => renderVideoItem(v, i)).join('');
      noVideos.hidden = true;
    } else {
      videoList.innerHTML = '';
      noVideos.hidden = false;
    }
  }

  function renderVideoItem(video, index) {
    const embedUrl = video.url || '';
    const viewUrl = video.viewUrl || embedUrl.replace('/preview', '/view');
    const streamUrl = video.streamUrl || '';
    const title = escapeHtml(video.name || `فيديو ${index + 1}`);

    return `
      <div class="video-item" data-index="${index}">
        <div class="video-player" id="video-player-${index}">
          <button type="button" class="video-play-btn" data-embed="${escapeHtml(embedUrl)}"
            data-stream="${escapeHtml(streamUrl)}" data-view="${escapeHtml(viewUrl)}"
            aria-label="تشغيل ${title}">
            <span class="video-play-icon">▶</span>
            <span class="video-play-label">${title}</span>
          </button>
        </div>
        <a class="video-open-link" href="${escapeHtml(viewUrl)}" target="_blank"
           rel="noopener noreferrer">فتح الفيديو في Google Drive</a>
      </div>`;
  }

  function initVideos() {
    document.getElementById('video-list')?.addEventListener('click', e => {
      const btn = e.target.closest('.video-play-btn');
      if (!btn || btn.dataset.loaded) return;

      const embedUrl = btn.dataset.embed;
      const streamUrl = btn.dataset.stream;
      btn.dataset.loaded = '1';

      if (streamUrl) {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.className = 'video-native';
        video.src = streamUrl;
        video.textContent = 'متصفحك لا يدعم تشغيل الفيديو';
        video.addEventListener('error', () => {
          video.replaceWith(createVideoIframe(embedUrl));
        });
        btn.replaceWith(video);
        video.play().catch(() => {});
        return;
      }

      btn.replaceWith(createVideoIframe(embedUrl));
    });
  }

  function createVideoIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.className = 'video-embed';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.title = 'فيديو المشروع';
    return iframe;
  }

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');

    document.getElementById('photo-grid')?.addEventListener('click', e => {
      const btn = e.target.closest('.photo-item');
      if (!btn) return;
      openLightbox(parseInt(btn.dataset.index, 10));
    });

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev').addEventListener('click', () => navigateLightbox(1));
    document.getElementById('lightbox-next').addEventListener('click', () => navigateLightbox(-1));

    lb.addEventListener('click', e => {
      if (e.target === lb) closeLightbox();
    });

    function openLightbox(index) {
      lightboxIndex = index;
      updateLightboxImage();
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lb.hidden = true;
      document.body.style.overflow = '';
    }

    function navigateLightbox(dir) {
      lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
      updateLightboxImage();
    }

    function updateLightboxImage() {
      img.src = lightboxPhotos[lightboxIndex];
      counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
    }

    let touchStartX = 0;
    lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) navigateLightbox(diff > 0 ? 1 : -1);
    }, { passive: true });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { initHome, initCategory, initProject };
})();
