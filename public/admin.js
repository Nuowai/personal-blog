const $ = (selector) => document.querySelector(selector);
const TOKEN_KEY = 'sakura-note-admin-token';
let posts = [];
let media = [];

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const token = () => localStorage.getItem(TOKEN_KEY) || '';
const hint = (selector, message, error = false) => { const node = $(selector); node.textContent = message; node.classList.toggle('error', error); };

async function api(url, options = {}) {
  const headers = { 'x-admin-token': token(), ...(options.body instanceof FormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || '请求失败');
  return data;
}

function showEditor() { $('#login-panel').hidden = true; $('#editor-panel').hidden = false; loadAdminPosts(); loadMedia(); loadTheme(); }
function showLogin() { $('#login-panel').hidden = false; $('#editor-panel').hidden = true; }
async function verifyToken() { try { await api('/api/posts'); showEditor(); } catch { localStorage.removeItem(TOKEN_KEY); showLogin(); } }

function renderAdminPosts() {
  $('#admin-post-list').innerHTML = posts.length ? posts.map((post) => `<div class="admin-post-item" data-id="${post.id}"><span class="post-mini-emoji">${escapeHtml(post.cover_emoji)}</span><strong>${escapeHtml(post.title)}<small>${post.published ? '已发布' : '草稿'}</small></strong><button data-action="edit" type="button">编辑</button><button data-action="delete" type="button">删</button></div>`).join('') : '<div class="admin-empty">文章抽屉还是空的～</div>';
}

function formatSize(size) { if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`; return `${(size / 1024 / 1024).toFixed(1)}MB`; }
function renderMedia() {
  $('#media-list').innerHTML = media.length ? media.map((item) => `<div class="media-item"><div class="media-preview">${item.mime_type.startsWith('image/') ? `<img src="${item.url}" alt="">` : item.mime_type.startsWith('video/') ? '▶' : '♫'}</div><div class="media-info"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${formatSize(item.size)}</small></div><button data-media-action="insert" data-id="${item.id}" type="button">插入</button><button data-media-action="delete" data-id="${item.id}" type="button">删</button></div>`).join('') : '<div class="admin-empty">还没有上传媒体～</div>';
}

async function loadAdminPosts() { try { posts = (await api('/api/posts')).posts; renderAdminPosts(); } catch (error) { hint('#editor-hint', error.message, true); } }
async function loadMedia() { try { media = (await api('/api/media')).media; renderMedia(); } catch (error) { hint('#media-hint', error.message, true); } }
async function loadTheme() { try { $('#theme-select').value = (await fetch('/api/settings').then((response) => response.json())).theme; } catch {} }

function resetEditor() { $('#post-form').reset(); $('#post-id').value = ''; $('#category').value = '日常'; $('#cover-emoji').value = '🌸'; $('#published').checked = true; $('#editor-title').textContent = '写一篇新文章'; }
function editPost(post) { $('#post-id').value = post.id; $('#title').value = post.title; $('#category').value = post.category; $('#tags').value = (post.tags || []).join(','); $('#cover-emoji').value = post.cover_emoji; $('#cover-image').value = post.cover_image || ''; $('#excerpt').value = post.excerpt; $('#content').value = post.content; $('#published').checked = post.published; $('#editor-title').textContent = '修改这篇文章'; window.scrollTo({ top: 0, behavior: 'smooth' }); }

function insertMedia(item) {
  const textarea = $('#content');
  let snippet = item.mime_type.startsWith('image/') ? `\n![${item.name}](${item.url})\n` : item.mime_type.startsWith('video/') ? `\n<video controls src="${item.url}"></video>\n` : `\n<audio controls src="${item.url}"></audio>\n`;
  const start = textarea.selectionStart ?? textarea.value.length; textarea.value = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(textarea.selectionEnd ?? start)}`; textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
}

$('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); const value = $('#admin-token').value.trim(); localStorage.setItem(TOKEN_KEY, value); hint('#login-hint', '正在打开小屋…'); try { await api('/api/posts'); showEditor(); } catch { localStorage.removeItem(TOKEN_KEY); hint('#login-hint', '密钥不对，再试试看吧～', true); } });
$('#logout-button').addEventListener('click', () => { localStorage.removeItem(TOKEN_KEY); showLogin(); });
$('#clear-button').addEventListener('click', resetEditor);

$('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('#post-id').value;
  const payload = { title: $('#title').value, category: $('#category').value, tags: $('#tags').value, cover_emoji: $('#cover-emoji').value, cover_image: $('#cover-image').value, excerpt: $('#excerpt').value, content: $('#content').value, published: $('#published').checked };
  try { await api(id ? `/api/posts/${id}` : '/api/posts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); hint('#editor-hint', '保存成功，花瓣已经飘起来了 ✨'); resetEditor(); await loadAdminPosts(); } catch (error) { hint('#editor-hint', error.message, true); }
});

$('#upload-media').addEventListener('click', async () => {
  const file = $('#media-file').files[0]; if (!file) return hint('#media-hint', '先选择一个文件哦～', true);
  const form = new FormData(); form.append('file', file); hint('#media-hint', '正在上传，请稍等…');
  try { await api('/api/media', { method: 'POST', body: form }); $('#media-file').value = ''; hint('#media-hint', '上传成功，点击媒体旁边的"插入"吧 ✨'); await loadMedia(); } catch (error) { hint('#media-hint', error.message, true); }
});

$('#media-list').addEventListener('click', async (event) => {
  const button = event.target.closest('button'); if (!button) return; const item = media.find((entry) => String(entry.id) === button.dataset.id); if (!item) return;
  if (button.dataset.mediaAction === 'insert') insertMedia(item);
  if (button.dataset.mediaAction === 'delete' && confirm(`确定删除「${item.name}」吗？`)) { try { await api(`/api/media/${item.id}`, { method: 'DELETE' }); await loadMedia(); } catch (error) { hint('#media-hint', error.message, true); } }
});

$('#admin-post-list').addEventListener('click', async (event) => {
  const item = event.target.closest('.admin-post-item'); if (!item) return; const post = posts.find((entry) => String(entry.id) === item.dataset.id); if (!post) return;
  if (event.target.dataset.action === 'edit') editPost(post);
  if (event.target.dataset.action === 'delete' && confirm(`确定要删除「${post.title}」吗？`)) { try { await api(`/api/posts/${post.id}`, { method: 'DELETE' }); await loadAdminPosts(); hint('#editor-hint', '文章已删除。'); } catch (error) { hint('#editor-hint', error.message, true); } }
});

$('#save-theme').addEventListener('click', async () => { try { await api('/api/settings', { method: 'PUT', body: JSON.stringify({ theme: $('#theme-select').value }) }); localStorage.setItem('sakura-note-theme', $('#theme-select').value); hint('#editor-hint', '主题已保存，首页刷新后就会换装啦 ✨'); } catch (error) { hint('#editor-hint', error.message, true); } });
if (token()) verifyToken();
