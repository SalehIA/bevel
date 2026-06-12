/**
 * Bevel Portfolio App
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
  let currentVideos = [];
  let activeFeedIndex = -1;
  let feedScrollEl = null;

  async function loadManifest() {
    if (manifest) return manifest;

    const configRes = await fetch('drive.config.json');
    const config = await configRes.json();

    document.querySelectorAll('.loading').forEach(el => {
      el.textContent = 'جاري التحميل من Google Drive...';
    });

    if (config.appsScriptUrl) {
      const sep = config.appsScriptUrl.includes('?') ? '&' : '?';
      const url = `${config.appsScriptUrl}${sep}t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load portfolio from Google Drive');
      manifest = await res.json();
      if (manifest.error) throw new Error(manifest.error);
      return manifest;
    }

    if (config.apiKey && typeof DriveLoader !== 'undefined') {
      manifest = await DriveLoader.buildManifest(config);
      return manifest;
    }

    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
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
    const inner = `<img src="${LOGO_SRC}" alt="Bevel" class="logo-img">`;
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

    const subtitle = hasValue(project.description) ? escapeHtml(project.description) : '';

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
      initMediaToggle(project);
      initVideoThumbs();
      initVideoFeed();
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
    } else {
      hero.innerHTML = '';
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

    actions.innerHTML = actionItems.join('');
    actions.hidden = actionItems.length === 0;

    const photos = project.photos || [];
    currentVideos = project.videos || [];
    const photoGrid = document.getElementById('photo-grid');
    const videoGrid = document.getElementById('video-grid');
    const noPhotos = document.getElementById('no-photos');
    const noVideos = document.getElementById('no-videos');
    const toggleVideos = document.getElementById('toggle-videos');

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

    if (currentVideos.length) {
      videoGrid.innerHTML = currentVideos.map((v, i) => renderVideoThumb(v, i)).join('');
      noVideos.hidden = true;
      if (toggleVideos) toggleVideos.hidden = false;
    } else {
      videoGrid.innerHTML = '';
      noVideos.hidden = false;
      if (toggleVideos) toggleVideos.hidden = true;
      setMediaTab('photos');
    }
  }

  function renderVideoThumb(video, index) {
    const poster = video.thumbnail || video.poster || '';
    const posterHtml = poster
      ? `<img src="${escapeHtml(poster)}" alt="" loading="lazy">`
      : `<div class="video-thumb-fallback">▶</div>`;

    return `
      <button type="button" class="video-thumb" data-video-index="${index}" aria-label="تشغيل الفيديو ${index + 1}">
        ${posterHtml}
        <span class="video-thumb-play"><span>▶</span></span>
      </button>`;
  }

  function initMediaToggle(project) {
    const toggle = document.getElementById('media-toggle');
    if (!toggle) return;

    const hasPhotos = (project.photos || []).length > 0;
    const hasVideos = (project.videos || []).length > 0;
    const photosBtn = document.getElementById('toggle-photos');
    const videosBtn = document.getElementById('toggle-videos');

    if (!hasPhotos && !hasVideos) {
      toggle.hidden = true;
      return;
    }

    toggle.hidden = false;
    if (!hasPhotos) setMediaTab('videos');
    else setMediaTab('photos');

    photosBtn?.addEventListener('click', () => setMediaTab('photos'));
    videosBtn?.addEventListener('click', () => setMediaTab('videos'));
  }

  function setMediaTab(tab) {
    const photosBtn = document.getElementById('toggle-photos');
    const videosBtn = document.getElementById('toggle-videos');
    const photosPanel = document.getElementById('media-photos');
    const videosPanel = document.getElementById('media-videos');

    const isPhotos = tab === 'photos';
    photosBtn?.classList.toggle('active', isPhotos);
    videosBtn?.classList.toggle('active', !isPhotos);
    if (photosPanel) photosPanel.hidden = !isPhotos;
    if (videosPanel) videosPanel.hidden = isPhotos;
  }

  function initVideoThumbs() {
    document.getElementById('video-grid')?.addEventListener('click', e => {
      const btn = e.target.closest('.video-thumb');
      if (!btn) return;
      openVideoFeed(parseInt(btn.dataset.videoIndex, 10));
    });
  }

  function initVideoFeed() {
    const feed = document.getElementById('video-feed');
    const closeBtn = document.getElementById('video-feed-close');
    feedScrollEl = document.getElementById('video-feed-scroll');

    closeBtn?.addEventListener('click', closeVideoFeed);

    feedScrollEl?.addEventListener('scroll', () => {
      window.requestAnimationFrame(handleFeedScroll);
    }, { passive: true });

    feedScrollEl?.addEventListener('click', e => {
      const overlay = e.target.closest('.video-tap-overlay');
      if (!overlay) return;
      const slide = overlay.closest('.video-feed-slide');
      const video = slide?.querySelector('.feed-video');
      if (!video) return;
      if (video.paused) {
        video.play().then(() => overlay.classList.remove('is-paused')).catch(() => {});
      } else {
        video.pause();
        overlay.classList.add('is-paused');
      }
    });
  }

  function handleFeedScroll() {
    if (!feedScrollEl) return;
    const index = getFeedSlideIndex();
    if (index >= 0 && index !== activeFeedIndex) {
      playFeedSlide(index);
    }
  }

  function getFeedSlideIndex() {
    if (!feedScrollEl || !feedScrollEl.children.length) return 0;
    const h = feedScrollEl.clientHeight || window.innerHeight;
    return Math.min(
      currentVideos.length - 1,
      Math.max(0, Math.round(feedScrollEl.scrollTop / h))
    );
  }

  function openVideoFeed(startIndex) {
    if (!currentVideos.length) return;

    const feed = document.getElementById('video-feed');
    feedScrollEl = document.getElementById('video-feed-scroll');
    if (!feed || !feedScrollEl) return;

    feedScrollEl.innerHTML = currentVideos.map((video, i) => `
      <div class="video-feed-slide" data-index="${i}">
        <div class="video-slide-inner">
          <video class="feed-video" playsinline webkit-playsinline preload="auto"></video>
          <button type="button" class="video-tap-overlay" aria-label="تشغيل / إيقاف">
            <span class="video-tap-icon">▶</span>
          </button>
        </div>
        <span class="video-feed-indicator">${i + 1} / ${currentVideos.length}</span>
      </div>`).join('');

    feed.hidden = false;
    document.body.style.overflow = 'hidden';
    activeFeedIndex = -1;

    requestAnimationFrame(() => {
      feedScrollEl.scrollTop = startIndex * feedScrollEl.clientHeight;
      playFeedSlide(startIndex);
    });
  }

  function playFeedSlide(index) {
    if (!feedScrollEl || index < 0 || index >= currentVideos.length) return;

    stopAllFeedVideos();

    activeFeedIndex = index;
    const slide = feedScrollEl.children[index];
    const video = slide.querySelector('.feed-video');
    const overlay = slide.querySelector('.video-tap-overlay');
    const data = currentVideos[index];
    if (!video) return;

    overlay?.classList.remove('is-paused');

    const startPlayback = () => {
    video.onended = () => {
      if (index < currentVideos.length - 1) {
        const next = index + 1;
        feedScrollEl.scrollTo({ top: next * feedScrollEl.clientHeight, behavior: 'smooth' });
        window.setTimeout(() => playFeedSlide(next), 400);
      }
    };

      video.play()
        .then(() => overlay?.classList.remove('is-paused'))
        .catch(() => {
          overlay?.classList.add('is-paused');
          showFeedFallback(slide, data);
        });
    };

    if (video.dataset.loaded === '1') {
      startPlayback();
      return;
    }

    const stream = data.streamUrl || '';
    const embed = data.url || '';

    if (stream) {
      video.src = stream;
      video.dataset.loaded = '1';
      if (video.readyState >= 2) {
        startPlayback();
      } else {
        video.addEventListener('canplay', startPlayback, { once: true });
        video.addEventListener('error', () => showFeedFallback(slide, data), { once: true });
      }
      return;
    }

    showFeedFallback(slide, data, embed);
  }

  function stopAllFeedVideos() {
    feedScrollEl?.querySelectorAll('.feed-video').forEach(video => {
      video.pause();
      video.onended = null;
    });
    feedScrollEl?.querySelectorAll('.video-tap-overlay').forEach(overlay => {
      overlay.classList.add('is-paused');
    });
  }

  function showFeedFallback(slide, data, embedUrl) {
    const existing = slide.querySelector('.video-feed-fallback');
    if (existing) return;

    const link = document.createElement('a');
    link.className = 'video-feed-fallback';
    link.href = data.viewUrl || embedUrl || data.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'فتح الفيديو';
    slide.appendChild(link);
  }

  function closeVideoFeed() {
    const feed = document.getElementById('video-feed');
    if (!feed) return;

    stopAllFeedVideos();
    feedScrollEl?.querySelectorAll('.feed-video').forEach(video => {
      video.removeAttribute('src');
      video.load();
      delete video.dataset.loaded;
    });

    if (feedScrollEl) feedScrollEl.innerHTML = '';
    activeFeedIndex = -1;
    feed.hidden = true;
    document.body.style.overflow = '';
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
