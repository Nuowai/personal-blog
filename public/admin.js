const { $, t, escapeHtml, safeUrl, errorMessage, request, setHint, initSiteSettings } = window.Sakura;
const TOKEN_KEY = 'sakura-note-admin-token';
let posts = [];
let media = [];
let adminIdentity = {};

const token = () => sessionStorage.getItem(TOKEN_KEY) || '';
const api = (url, options = {}) => request(url, { ...options, headers: { 'x-admin-token': token(), ...(options.headers || {}) } });

async function showEditor() {
  $('#login-panel').hidden = true;
  $('#editor-panel').hidden = false;
  await Promise.all([loadAdminPosts(), loadMedia(), loadSettings()]);
}
function showLogin() {
  $('#login-panel').hidden = false;
  $('#editor-panel').hidden = true;
}
async function verifyToken() {
  try { const result = await api('/api/auth/admin-check'); adminIdentity = result.admin || {}; await showEditor(); }
  catch (error) { sessionStorage.removeItem(TOKEN_KEY); showLogin(); if (error.status !== 401) setHint('#login-hint', errorMessage(error), true); }
}
function renderAdminPosts() {
  $('#admin-post-list').innerHTML = posts.length ? posts.map((post) => `<div class="admin-post-item" data-id="${post.id}"><span class="post-mini-emoji">${escapeHtml(post.cover_emoji)}</span><strong>${escapeHtml(post.title)}<small>${post.published ? t('admin.published') : t('admin.draft')}</small></strong><button data-action="edit" type="button">${t('admin.edit')}</button><button data-action="delete" type="button">${t('admin.delete')}</button></div>`).join('')  : `<div class="admin-empty">${t('admin.emptyPosts')}</div>`;
}
function formatSize(size) {
  const bytes = Number(size) || 0;
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
function renderMedia() {
  $('#media-list').innerHTML = media.length ? media.map((item) => {
    const url = safeUrl(item.url);
    const preview = item.mime_type.startsWith('image/') && url ? `<img src="${escapeHtml(url)}" alt="">` : item.mime_type.startsWith('video/') ? '▶' : '♫';
    return `<div class="media-item"><div class="media-preview">${preview}</div><div class="media-info"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${formatSize(item.size)}</small></div><button data-media-action="insert" data-id="${item.id}" type="button">插入</button><button data-media-action="delete" data-id="${item.id}" type="button">删</button></div>`;
  }).join('')  : `<div class="admin-empty">${t('admin.emptyMedia')}</div>`;
}
async function loadAdminPosts() {
  try { posts = (await api('/api/admin/posts')).posts; renderAdminPosts(); }
  catch (error) { setHint('#editor-hint', errorMessage(error), true); }
}
async function loadMedia() {
  try { media = (await api('/api/media')).media; renderMedia(); }
  catch (error) { setHint('#media-hint', errorMessage(error), true); }
}
async function loadSettings() {
  try {
    const settings = await initSiteSettings();
    $('#theme-select').value = settings.theme || 'sakura';
    $('#site-title').value = settings.siteTitle || '';
    $('#site-description').value = settings.siteDescription || '';
    $('#favicon-url').value = settings.faviconUrl || '';
    $('#wallpaper-url').value = settings.wallpaperUrl || '';
    $('#admin-identity').textContent = adminIdentity.email ? `${adminIdentity.name || '糯歪'} · ${adminIdentity.email}` : (adminIdentity.name || '糯歪');
  } catch (error) {
    setHint('#site-settings-hint', errorMessage(error), true);
  }
}
function resetEditor() {
  $('#post-form').reset(); $('#post-id').value = ''; $('#category').value = '日常'; $('#cover-emoji').value = '🌸'; $('#published').checked = true; $('#editor-title').textContent = '写一篇新文章';
}
async function editPost(post) {
  try {
    const result = await api(`/api/admin/posts/${post.id}`);
    const detail = result.post;
    $('#post-id').value = detail.id;
    $('#title').value = detail.title;
    $('#category').value = detail.category;
    $('#tags').value = (detail.tags || []).join(',');
    $('#cover-emoji').value = detail.cover_emoji;
    $('#cover-image').value = detail.cover_image || '';
    $('#excerpt').value = detail.excerpt;
    $('#content').value = detail.content || '';
    $('#published').checked = detail.published;
    $('#editor-title').textContent = '修改这篇文章';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    setHint('#editor-hint', errorMessage(error), true);
  }
}
function insertMedia(item) {
  const textarea = $('#content');
  const url = safeUrl(item.url);
  if (!url) return;
  const snippet = item.mime_type.startsWith('image/') ? `\n![${item.name}](${url})\n` : item.mime_type.startsWith('video/') ? `\n<video controls src="${url}"></video>\n` : `\n<audio controls src="${url}"></audio>\n`;
  const start = textarea.selectionStart ?? textarea.value.length;
  textarea.value = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(textarea.selectionEnd ?? start)}`;
  textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = $('#admin-token').value.trim();
  sessionStorage.setItem(TOKEN_KEY, value);
  setHint('#login-hint', t('common.loading'));
  try { const result = await api('/api/auth/admin-check'); adminIdentity = result.admin || {}; await showEditor(); }
  catch (error) { sessionStorage.removeItem(TOKEN_KEY); setHint('#login-hint', errorMessage(error, 'admin.invalidToken'), true); }
});
$('#logout-button').addEventListener('click', () => { sessionStorage.removeItem(TOKEN_KEY); showLogin(); });
$('#clear-button').addEventListener('click', resetEditor);

$('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('#post-id').value;
  const payload = { title: $('#title').value, category: $('#category').value, tags: $('#tags').value, cover_emoji: $('#cover-emoji').value, cover_image: $('#cover-image').value, excerpt: $('#excerpt').value, content: $('#content').value, published: $('#published').checked };
  try { await api(id ? `/api/posts/${id}` : '/api/posts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); setHint('#editor-hint', t('admin.saved')); resetEditor(); await loadAdminPosts(); }
  catch (error) { setHint('#editor-hint', errorMessage(error), true); }
});
$('#upload-media').addEventListener('click', async () => {
  const file = $('#media-file').files[0];
  if (!file) return setHint('#media-hint', t('admin.chooseFile'), true);
  const form = new FormData(); form.append('file', file); setHint('#media-hint', t('common.loading'));
  try { await api('/api/media', { method: 'POST', body: form }); $('#media-file').value = ''; setHint('#media-hint', t('admin.uploaded')); await loadMedia(); }
  catch (error) { setHint('#media-hint', errorMessage(error), true); }
});
$('#media-list').addEventListener('click', async (event) => {
  const button = event.target.closest('button'); if (!button) return;
  const item = media.find((entry) => String(entry.id) === button.dataset.id); if (!item) return;
  if (button.dataset.mediaAction === 'insert') return insertMedia(item);
  if (button.dataset.mediaAction === 'delete' && confirm(t('admin.confirmDeleteMedia', { name: item.name }))) {
    try { await api(`/api/media/${item.id}`, { method: 'DELETE' }); await loadMedia(); setHint('#media-hint', t('admin.deleted')); }
    catch (error) { setHint('#media-hint', errorMessage(error), true); }
  }
});
$('#admin-post-list').addEventListener('click', async (event) => {
  const item = event.target.closest('.admin-post-item'); if (!item) return;
  const post = posts.find((entry) => String(entry.id) === item.dataset.id); if (!post) return;
  if (event.target.dataset.action === 'edit') return editPost(post);
  if (event.target.dataset.action === 'delete' && confirm(t('admin.confirmDeletePost', { name: post.title }))) {
    try { await api(`/api/posts/${post.id}`, { method: 'DELETE' }); await loadAdminPosts(); setHint('#editor-hint', t('admin.deleted')); }
    catch (error) { setHint('#editor-hint', errorMessage(error), true); }
  }
});
async function saveSiteSettings() {
  try {
    const result = await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        theme: $('#theme-select').value,
        siteTitle: $('#site-title').value,
        siteDescription: $('#site-description').value,
        faviconUrl: $('#favicon-url').value,
        wallpaperUrl: $('#wallpaper-url').value
      })
    });
    const saved = result.settings || {};
    localStorage.setItem('sakura-note-theme', saved.theme || $('#theme-select').value);
    setHint('#site-settings-hint', t('admin.saved'));
  } catch (error) {
    setHint('#site-settings-hint', errorMessage(error), true);
  }
}
$('#site-settings-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveSiteSettings();
});
$('#save-theme').addEventListener('click', () => $('#site-settings-form')?.requestSubmit());
window.addEventListener('sakura:locale-change', () => { renderAdminPosts(); renderMedia(); loadSettings(); });
if (token()) verifyToken();
