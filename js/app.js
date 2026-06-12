/**
 * Bevel Portfolio App
 * Loads manifest.json and renders portfolio pages for GitHub Pages.
 */

const App = (() => {
  const MANIFEST_URL = 'data/manifest.json';
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

  function encodePath(...parts) {
    return parts.map(p => encodeURIComponent(p)).join('/');
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

  function isEmbedVideo(video) {
    return video && typeof video === 'object' && video.embed;
  }

  function formatPhone(phone) {
    return phone.replace(/\s/g, '');
  }

  /* ── Home ── */
  async function initHome() {
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

  /* ── Category listing ── */
  async function initCategory() {
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

    return `
      <a href="${projectUrl(category, project.slug)}" class="project-card">
        <div class="project-thumb">${thumb}</div>
        <div class="project-card-body">
          <h3>${escapeHtml(project.name)}</h3>
          <p>${escapeHtml(project.location || '')}</p>
        </div>
      </a>`;
  }

  /* ── Project detail ── */
  async function initProject() {
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
    const fields = [
      { label: 'اسم المشروع', value: project.name },
      { label: 'النطاق', value: project.scope },
      { label: 'الموقع', value: project.location },
      { label: 'الممثل', value: project.representative?.name },
      { label: 'الهاتف', value: project.representative?.phone }
    ];

    if (project.year) fields.splice(3, 0, { label: 'السنة', value: project.year });
    if (project.description) fields.push({ label: 'الوصف', value: project.description });

    info.innerHTML = fields
      .filter(f => f.value)
      .map(f => `<div><dt>${f.label}</dt><dd>${escapeHtml(String(f.value))}</dd></div>`)
      .join('');

    const contactBtn = document.getElementById('contact-btn');
    if (project.representative?.phone) {
      contactBtn.href = `tel:${formatPhone(project.representative.phone)}`;
      contactBtn.querySelector('#contact-text').textContent =
        `اتصل بـ ${project.representative.name || 'الممثل'}`;
    } else {
      contactBtn.hidden = true;
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
    } else {
      noPhotos.hidden = false;
    }

    const videos = project.videos || [];
    const videoList = document.getElementById('video-list');
    const noVideos = document.getElementById('no-videos');

    if (videos.length) {
      videoList.innerHTML = videos.map(v => {
        if (isEmbedVideo(v)) {
          return `
        <div class="video-item">
          <iframe src="${v.url}" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"
            title="${escapeHtml(v.name || 'فيديو')}"></iframe>
        </div>`;
        }
        return `
        <div class="video-item">
          <video controls playsinline preload="metadata"
            src="${mediaUrl(category, project.slug, v)}">
            متصفحك لا يدعم تشغيل الفيديو
          </video>
        </div>`;
      }).join('');
    } else {
      noVideos.hidden = false;
    }
  }

  /* ── Lightbox ── */
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
