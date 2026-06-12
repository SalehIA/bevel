/**
 * Build portfolio manifest live from Google Drive API (no GitHub copy needed).
 */
const DriveLoader = (() => {
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.svg']);
  const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);

  function normalizeName(text) {
    return String(text).replace(/[\u200e\u200f\u202a-\u202e\u8234-\u8238]/g, '').trim();
  }

  function ext(name) {
    const i = name.lastIndexOf('.');
    return i >= 0 ? name.slice(i).toLowerCase() : '';
  }

  function isMetaFile(name) {
    const lower = normalizeName(name).toLowerCase();
    if (['project.json', 'project.txt', 'info.json', 'info.txt'].includes(lower)) return true;
    if (lower.startsWith('project.json')) return true;
    return lower.endsWith('.json');
  }

  function isThumbnailName(name) {
    const stem = normalizeName(name).replace(/\.[^/.]+$/, '').toLowerCase();
    return stem === 'thumbnail';
  }

  function isImage(name, mime) {
    return (mime && mime.startsWith('image/')) || IMAGE_EXT.has(ext(name));
  }

  function isVideo(name, mime) {
    return (mime && mime.startsWith('video/')) || VIDEO_EXT.has(ext(name));
  }

  function driveImageUrl(id, size = 1200) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  }

  function driveVideoEntry(id, name) {
    return {
      name,
      id,
      url: `https://drive.google.com/file/d/${id}/preview`,
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      streamUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      embed: true
    };
  }

  async function listFolder(folderId, apiKey) {
    const files = [];
    let pageToken = '';

    do {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = encodeURIComponent('nextPageToken,files(id,name,mimeType)');
      let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=1000&key=${encodeURIComponent(apiKey)}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Drive API error');
      files.push(...(data.files || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    return files;
  }

  async function downloadText(fileId, apiKey) {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to download metadata file');
    return res.text();
  }

  function rtfToPlain(raw) {
    let text = raw;
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
      const byte = parseInt(hex, 16);
      try {
        return new TextDecoder('windows-1256').decode(new Uint8Array([byte]));
      } catch {
        return String.fromCharCode(byte);
      }
    });
    text = text.replace(/\\uc0\\u(-?\d+)/g, (_, code) => String.fromCharCode(Number(code) & 0xffff));
    text = text.replace(/\\[a-z]+\d*/gi, ' ');
    text = text.replace(/\\[\\{}]/g, '');
    text = text.replace(/[\u200e\u200f\u202a-\u202e\u8234-\u8238]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function extractFields(text) {
    const meta = {};
    const compact = text.replace(/\s+/g, '');

    for (const key of ['name', 'description']) {
      const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
      if (match) meta[key] = match[1].trim();
    }

    const linkMatch = compact.match(/"locationLink"\s*:\s*"(https?:[^"]+)"/i);
    if (linkMatch) meta.locationLink = linkMatch[1];

    const engName = text.match(/"siteEngineer"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
    const engPhone = text.match(/"phone"\s*:\s*"([^"]+)"/);
    if (engName || engPhone) {
      meta.siteEngineer = {};
      if (engName) meta.siteEngineer.name = engName[1].trim();
      if (engPhone) meta.siteEngineer.phone = engPhone[1].trim();
    }
    return meta;
  }

  function parseMetadata(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{\\rtf')) {
      return extractFields(rtfToPlain(trimmed));
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return extractFields(trimmed);
    }
  }

  async function collectMediaFiles(folderId, apiKey, photos, videos, thumbnailRef) {
    const entries = await listFolder(folderId, apiKey);

    for (const file of entries) {
      const name = normalizeName(file.name);

      if (file.mimeType === FOLDER_MIME) {
        await collectMediaFiles(file.id, apiKey, photos, videos, thumbnailRef);
        continue;
      }

      if (isMetaFile(name)) continue;

      if (isImage(name, file.mimeType)) {
        const entry = { name, id: file.id, url: driveImageUrl(file.id) };
        if (isThumbnailName(name)) {
          thumbnailRef.current = entry;
        } else {
          photos.push(entry);
        }
      } else if (isVideo(name, file.mimeType)) {
        videos.push(driveVideoEntry(file.id, name));
      }
    }
  }

  async function buildProject(projectFolder, apiKey) {
    const slug = normalizeName(projectFolder.name);
    const files = await listFolder(projectFolder.id, apiKey);

    let meta = {};
    const metaFile = files.find(f => f.mimeType !== FOLDER_MIME && isMetaFile(normalizeName(f.name)));
    if (metaFile) {
      try {
        meta = parseMetadata(await downloadText(metaFile.id, apiKey));
      } catch (e) {
        console.warn('Metadata parse failed for', slug, e);
      }
    }

    const photos = [];
    const videos = [];
    const thumbnailRef = { current: null };

    for (const file of files) {
      const name = normalizeName(file.name);
      if (file.mimeType === FOLDER_MIME) {
        await collectMediaFiles(file.id, apiKey, photos, videos, thumbnailRef);
        continue;
      }
      if (isMetaFile(name)) continue;
      if (isImage(name, file.mimeType)) {
        const entry = { name, id: file.id, url: driveImageUrl(file.id) };
        if (isThumbnailName(name)) thumbnailRef.current = entry;
        else photos.push(entry);
      } else if (isVideo(name, file.mimeType)) {
        videos.push(driveVideoEntry(file.id, name));
      }
    }

    photos.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    videos.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    const thumbnail = thumbnailRef.current || photos[0] || null;
    if (!photos.length && !videos.length) return null;

    const project = {
      slug,
      name: meta.name || slug,
      photos,
      videos,
      thumbnail
    };

    if (meta.description) project.description = meta.description;
    if (meta.locationLink) project.locationLink = meta.locationLink;
    if (meta.siteEngineer && (meta.siteEngineer.name || meta.siteEngineer.phone)) {
      project.siteEngineer = meta.siteEngineer;
    }

    return project;
  }

  async function buildManifest(config) {
    const apiKey = config.apiKey;
    const folderId = config.folderId;
    const categoryNames = Object.keys(config.categories || { 'التصميم': 1, 'التنفيذ': 1 });

    if (!apiKey) throw new Error('Google Drive API key missing in drive.config.json');
    if (!folderId) throw new Error('Drive folder ID missing in drive.config.json');

    const rootEntries = await listFolder(folderId, apiKey);
    const manifest = { categories: {}, source: 'drive-live', generatedAt: new Date().toISOString() };

    for (const catName of categoryNames) {
      const catFolder = rootEntries.find(
        f => f.mimeType === FOLDER_MIME && normalizeName(f.name) === catName
      );
      manifest.categories[catName] = [];
      if (!catFolder) continue;

      const projectFolders = (await listFolder(catFolder.id, apiKey))
        .filter(f => f.mimeType === FOLDER_MIME)
        .sort((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name), 'ar'));

      for (const projectFolder of projectFolders) {
        const project = await buildProject(projectFolder, apiKey);
        if (project) manifest.categories[catName].push(project);
      }
    }

    return manifest;
  }

  return { buildManifest };
})();
