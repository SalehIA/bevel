const api = (path, options = {}) =>
  fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  }).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  });

const els = {
  loginScreen: document.getElementById('login-screen'),
  adminScreen: document.getElementById('admin-screen'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  password: document.getElementById('password'),
  logoutBtn: document.getElementById('logout-btn'),
  rebuildBtn: document.getElementById('rebuild-btn'),
  categorySelect: document.getElementById('category-select'),
  refreshProjects: document.getElementById('refresh-projects'),
  projectList: document.getElementById('project-list'),
  projectForm: document.getElementById('project-form'),
  formTitle: document.getElementById('form-title'),
  editMode: document.getElementById('edit-mode'),
  slug: document.getElementById('slug'),
  name: document.getElementById('name'),
  description: document.getElementById('description'),
  locationLink: document.getElementById('locationLink'),
  engineerName: document.getElementById('engineerName'),
  engineerPhone: document.getElementById('engineerPhone'),
  saveBtn: document.getElementById('save-btn'),
  deleteBtn: document.getElementById('delete-btn'),
  filesSection: document.getElementById('files-section'),
  uploadForm: document.getElementById('upload-form'),
  fileInput: document.getElementById('file-input'),
  fileList: document.getElementById('file-list'),
  status: document.getElementById('status'),
};

let currentCategory = 'التنفيذ';
let currentSlug = '';

function setStatus(text) {
  els.status.textContent = text || '';
}

function resetForm() {
  currentSlug = '';
  els.editMode.value = 'create';
  els.formTitle.textContent = 'مشروع جديد';
  els.slug.disabled = false;
  els.projectForm.reset();
  els.deleteBtn.hidden = true;
  els.filesSection.hidden = true;
}

async function boot() {
  const me = await api('/me');
  if (me.authenticated) showAdmin();
}

function showAdmin() {
  els.loginScreen.hidden = true;
  els.adminScreen.hidden = false;
  loadCategories();
  loadProjects();
}

els.loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  els.loginError.hidden = true;
  try {
    await api('/login', { method: 'POST', body: { password: els.password.value } });
    showAdmin();
  } catch (err) {
    els.loginError.textContent = 'كلمة المرور غير صحيحة';
    els.loginError.hidden = false;
  }
});

els.logoutBtn.addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  location.reload();
});

els.rebuildBtn.addEventListener('click', async () => {
  try {
    await api('/rebuild-manifest', { method: 'POST' });
    setStatus('تم تحديث المعرض.');
  } catch (err) {
    setStatus(err.message);
  }
});

async function loadCategories() {
  const data = await api('/categories');
  els.categorySelect.innerHTML = data.categories
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
  currentCategory = data.categories[0] || 'التنفيذ';
}

async function loadProjects() {
  currentCategory = els.categorySelect.value;
  const data = await api(`/projects?category=${encodeURIComponent(currentCategory)}`);
  els.projectList.innerHTML = data.projects.length
    ? data.projects.map(p => `
        <div class="project-item">
          <div>
            <strong>${escapeHtml(p.slug)}</strong>
          </div>
          <button type="button" data-slug="${escapeHtml(p.slug)}">تعديل</button>
        </div>`).join('')
    : '<p>لا توجد مشاريع في هذا القسم.</p>';

  els.projectList.querySelectorAll('button[data-slug]').forEach(btn => {
    btn.addEventListener('click', () => openProject(btn.dataset.slug));
  });
}

async function openProject(slug) {
  currentSlug = slug;
  els.editMode.value = 'edit';
  els.formTitle.textContent = 'تعديل المشروع';
  els.slug.value = slug;
  els.slug.disabled = true;
  els.deleteBtn.hidden = false;
  els.filesSection.hidden = false;

  const manifest = await fetch(`/portfolio/data/manifest.json?t=${Date.now()}`).then(r => r.json());
  const project = (manifest.categories[currentCategory] || []).find(p => p.slug === slug) || {};
  els.name.value = project.name || slug;
  els.description.value = project.description || '';
  els.locationLink.value = project.locationLink || '';
  els.engineerName.value = project.siteEngineer?.name || '';
  els.engineerPhone.value = project.siteEngineer?.phone || '';
  await loadFiles();
}

async function loadFiles() {
  const data = await api(`/projects/${encodeURIComponent(currentCategory)}/${encodeURIComponent(currentSlug)}/files`);
  els.fileList.innerHTML = data.files.map(file => `
    <li>
      <span>${escapeHtml(file.name)}</span>
      <button type="button" data-name="${escapeHtml(file.name)}">حذف</button>
    </li>`).join('');

  els.fileList.querySelectorAll('button[data-name]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api(`/projects/${encodeURIComponent(currentCategory)}/${encodeURIComponent(currentSlug)}/files`, {
        method: 'DELETE',
        body: { name: btn.dataset.name },
      });
      await loadFiles();
      setStatus('تم حذف الملف.');
    });
  });
}

els.categorySelect.addEventListener('change', () => {
  resetForm();
  loadProjects();
});

els.refreshProjects.addEventListener('click', loadProjects);

els.projectForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    category: currentCategory,
    slug: els.slug.value.trim(),
    name: els.name.value.trim(),
    description: els.description.value.trim(),
    locationLink: els.locationLink.value.trim(),
    siteEngineer: {
      name: els.engineerName.value.trim(),
      phone: els.engineerPhone.value.trim(),
    },
  };

  try {
    if (els.editMode.value === 'create') {
      await api('/projects', { method: 'POST', body: payload });
      setStatus('تم إنشاء المشروع.');
    } else {
      await api(`/projects/${encodeURIComponent(currentCategory)}/${encodeURIComponent(currentSlug)}`, {
        method: 'PUT',
        body: payload,
      });
      setStatus('تم حفظ التعديلات.');
    }
    await loadProjects();
    if (els.editMode.value === 'create') resetForm();
    else await openProject(currentSlug);
  } catch (err) {
    setStatus(err.message);
  }
});

els.deleteBtn.addEventListener('click', async () => {
  if (!currentSlug || !confirm('هل تريد حذف هذا المشروع بالكامل؟')) return;
  await api(`/projects/${encodeURIComponent(currentCategory)}/${encodeURIComponent(currentSlug)}`, { method: 'DELETE' });
  resetForm();
  await loadProjects();
  setStatus('تم حذف المشروع.');
});

els.uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentSlug) return;
  const formData = new FormData();
  [...els.fileInput.files].forEach(file => formData.append('files', file));
  await api(`/projects/${encodeURIComponent(currentCategory)}/${encodeURIComponent(currentSlug)}/upload`, {
    method: 'POST',
    body: formData,
  });
  els.fileInput.value = '';
  await loadFiles();
  setStatus('تم رفع الملفات.');
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

boot().catch(() => {});
