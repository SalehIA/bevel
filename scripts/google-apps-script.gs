/**
 * Bevel Portfolio — Google Apps Script (no Google Cloud API key needed)
 *
 * Setup (one time, ~2 minutes):
 * 1. Open https://script.google.com → New project
 * 2. Paste this entire file, set ROOT_FOLDER_ID below
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL into drive.config.json → "appsScriptUrl"
 */

const ROOT_FOLDER_ID = '1mwN5fOhas66MznQOWGG1hlyoOVmkADyV';
const SCRIPT_VERSION = '2025-06-12-v4';
const CATEGORIES = ['التصميم', 'التنفيذ'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.svg'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];

function doGet(e) {
  if (e && e.parameter && e.parameter.ping === '1') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      scriptVersion: SCRIPT_VERSION,
      message: 'This deployment is running the latest saved code'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const manifest = buildManifest(ROOT_FOLDER_ID);
    return ContentService.createTextOutput(JSON.stringify(manifest))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildManifest(rootId) {
  const root = DriveApp.getFolderById(rootId);
  const manifest = {
    categories: {},
    source: 'drive-apps-script',
    scriptVersion: SCRIPT_VERSION,
    generatedAt: new Date().toISOString()
  };

  CATEGORIES.forEach(function (catName) {
    manifest.categories[catName] = [];
    const catFolder = findChildFolderByName(root, catName);
    if (!catFolder) return;

    const projectFolders = [];
    const it = catFolder.getFolders();
    while (it.hasNext()) projectFolders.push(it.next());
    projectFolders.sort(function (a, b) {
      return normalizeName(a.getName()).localeCompare(normalizeName(b.getName()), 'ar');
    });

    projectFolders.forEach(function (projFolder) {
      const project = buildProject(projFolder);
      if (project) manifest.categories[catName].push(project);
    });
  });

  return manifest;
}

function buildProject(folder) {
  const slug = normalizeName(folder.getName());
  let meta = {};
  const photos = [];
  const videos = [];
  let thumbnail = null;

  collectFromFolder(folder, function (file) {
    const name = normalizeName(file.getName());
    if (isMetaFile(name)) {
      if (!meta.name) meta = parseMetadata(file);
      return;
    }
    if (isImage(name)) {
      const entry = { name: name, id: file.getId(), url: driveImageUrl(file.getId()) };
      if (isThumbnailName(name)) thumbnail = entry;
      else photos.push(entry);
    } else if (isVideo(name)) {
      videos.push(driveVideoEntry(file.getId(), name));
    }
  });

  photos.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
  videos.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });

  if (!photos.length && !videos.length) return null;
  if (!thumbnail && photos.length) thumbnail = photos[0];

  const project = { slug: slug, name: meta.name || slug, photos: photos, videos: videos, thumbnail: thumbnail };
  if (meta.description) project.description = meta.description;
  if (meta.locationLink) project.locationLink = meta.locationLink;
  if (meta.siteEngineer && (meta.siteEngineer.name || meta.siteEngineer.phone)) {
    project.siteEngineer = meta.siteEngineer;
  }

  if (isBrokenText(project.name)) project.name = slug;
  if (project.description && isBrokenText(project.description)) delete project.description;
  if (project.siteEngineer && project.siteEngineer.name && isBrokenText(project.siteEngineer.name)) {
    delete project.siteEngineer.name;
    if (!project.siteEngineer.phone) delete project.siteEngineer;
  }

  return project;
}

function isBrokenText(text) {
  if (!text) return true;
  if (text.indexOf('\\rtf') >= 0 || text.indexOf('\\uc0') >= 0 || text.indexOf('\\f1') >= 0) return true;
  if (/[\u0080-\u009f]/.test(text) && /[ÃÔÑæÚÊäÝíÐ]/.test(text)) return true;
  return false;
}

function collectFromFolder(rootFolder, onFile) {
  var pending = [rootFolder];
  while (pending.length > 0) {
    var folder = pending.pop();
    var files = folder.getFiles();
    while (files.hasNext()) onFile(files.next());
    var childFolders = folder.getFolders();
    while (childFolders.hasNext()) pending.push(childFolders.next());
  }
}

function findChildFolderByName(parent, name) {
  const target = normalizeName(name);
  const it = parent.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    if (normalizeName(f.getName()) === target) return f;
  }
  return null;
}

function normalizeName(text) {
  return String(text).replace(/[\u200e\u200f\u202a-\u202e\u8234-\u8238]/g, '').trim();
}

function ext(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function isMetaFile(name) {
  const lower = name.toLowerCase();
  if (['project.json', 'project.txt', 'info.json', 'info.txt'].indexOf(lower) >= 0) return true;
  if (lower.indexOf('project.json') === 0) return true;
  return lower.slice(-5) === '.json';
}

function isThumbnailName(name) {
  return name.replace(/\.[^/.]+$/, '').toLowerCase() === 'thumbnail';
}

function isImage(name) {
  return IMAGE_EXT.indexOf(ext(name)) >= 0;
}

function isVideo(name) {
  return VIDEO_EXT.indexOf(ext(name)) >= 0;
}

function driveImageUrl(id, size) {
  size = size || 1200;
  return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + size;
}

function driveVideoEntry(id, name) {
  return {
    name: name,
    id: id,
    url: 'https://drive.google.com/file/d/' + id + '/preview',
    viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
    streamUrl: 'https://drive.google.com/uc?export=download&id=' + id,
    embed: true
  };
}

function parseMetadata(file) {
  var blob = file.getBlob();
  var text = readBlobText(blob).trim();
  if (text.indexOf('{\\rtf') === 0) return extractFields(rtfToPlain(text));
  try {
    return JSON.parse(text);
  } catch (e) {
    return extractFields(text);
  }
}

function readBlobText(blob) {
  var bytes = blob.getBytes();
  var utf8 = Utilities.newBlob(bytes).getDataAsString('UTF-8');
  if (utf8.indexOf('{\\rtf') === 0 || utf8.indexOf('{') === 0) return utf8;
  try {
    return Utilities.newBlob(bytes).getDataAsString('Windows-1256');
  } catch (e) {
    return utf8;
  }
}

function rtfToPlain(raw) {
  var text = raw;
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
  text = text.replace(/\\uc0\\u(\d+)/g, function (_, code) {
    return String.fromCharCode(Number(code));
  });
  text = text.replace(/\\u(\d+)/g, function (_, code) {
    return String.fromCharCode(Number(code));
  });
  text = text.replace(/\\[a-z]+\d*/gi, ' ');
  text = text.replace(/\\[\\{}]/g, '');
  text = text.replace(/[\u200e\u200f\u202a-\u202e\u8234-\u8238]/g, '');
  return text.replace(/\s+/g, ' ').trim();
}

function extractFields(text) {
  var meta = {};
  var compact = text.replace(/\s+/g, '');

  ['name', 'description'].forEach(function (key) {
    var re = new RegExp('"' + key + '"\\s*:\\s*"([^"]+)"');
    var m = text.match(re);
    if (m) meta[key] = m[1].trim();
  });

  var linkMatch = compact.match(/"locationLink"\s*:\s*"(https?:[^"]+)"/i);
  if (linkMatch) meta.locationLink = linkMatch[1];

  var engName = text.match(/"siteEngineer"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
  var engPhone = text.match(/"phone"\s*:\s*"([^"]+)"/);
  if (engName || engPhone) {
    meta.siteEngineer = {};
    if (engName) meta.siteEngineer.name = engName[1].trim();
    if (engPhone) meta.siteEngineer.phone = engPhone[1].trim();
  }
  return meta;
}
