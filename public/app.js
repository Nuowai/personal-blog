const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const formatDate = (value) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`));
let activeTag = '';

const themes = ['sakura', 'night', 'mint', 'lavender'];
function applyTheme(theme) { const chosen = themes.includes(theme) ? theme : 'sakura'; document.body.dataset.theme = chosen; localStorage.setItem('sakura-note-theme', chosen); $('#theme-toggle').textContent = chosen === 'night' ? '🌙' : chosen === 'mint' ? '🌿' : chosen === 'lavender' ? '💜' : '🌸'; }
async function loadTheme() { const saved = localStorage.getItem('sakura-note-theme'); if (saved) return applyTheme(saved); try { applyTheme((await fetch('/api/settings').then((response) => response.json())).theme); } catch { applyTheme('sakura'); } }
$('#theme-toggle').addEventListener('click', () => applyTheme(themes[(themes.indexOf(document.body.dataset.theme) + 1) % themes.length]));

function renderTagFilters(posts) {
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))].slice(0, 8);
  $('#tag-filters').innerHTML = tags.map((tag) => `<button class="tag-filter ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}" type="button">#${escapeHtml(tag)}</button>`).join('');
}

async function loadPosts() {
  const query = new URLSearchParams(); const keyword = $('#search-input').value.trim(); if (keyword) query.set('q', keyword); if (activeTag) query.set('tag', activeTag);
  const response = await fetch(`/api/posts?${query}`); if (!response.ok) throw new Error('文章加载失败'); const { posts } = await response.json();
  $('#post-count').textContent = `${posts.length} 篇记录`; renderTagFilters(posts);
  $('#post-list').innerHTML = posts.length ? posts.map((post) => `<a class="post-card" href="/post.html?slug=${encodeURIComponent(post.slug)}"><div class="post-cover">${post.cover_image ? `<img src="${post.cover_image}" alt="">` : escapeHtml(post.cover_emoji)}</div><div><div class="post-meta">${escapeHtml(post.category)} · ${formatDate(post.created_at)}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || '这篇小记录还没有摘要，点进去看看吧～')}</p><div class="post-tags">${(post.tags || []).slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('')}</div></div><span class="read-more">→</span></a>`).join('') : '<div class="empty-card">没有找到这类记录，换个关键词试试吧～</div>';
}

$('#search-form').addEventListener('submit', (event) => { event.preventDefault(); activeTag = ''; loadPosts(); });
$('#tag-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; activeTag = button.dataset.tag; loadPosts(); });

async function loadGuestbook() { const response = await fetch('/api/guestbook'); const { messages } = await response.json(); $('#guestbook-list').innerHTML = messages.length ? messages.slice(0, 3).map((item) => `<div class="guest-message"><strong>${escapeHtml(item.nickname)}</strong><p>${escapeHtml(item.message)}</p></div>`).join('') : '<div class="form-hint">这里还空着，等你来点亮它～</div>'; }
$('#guestbook-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const hint = $('#guestbook-hint'); const button = form.querySelector('button'); button.disabled = true; hint.textContent = '正在把留言送出去…'; try { const response = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || '发送失败'); form.reset(); hint.textContent = '收到啦，谢谢你的脚印 ✨'; await loadGuestbook(); } catch (error) { hint.textContent = error.message; hint.classList.add('error'); } finally { button.disabled = false; } });

function initDeepSeekChat() {
  const open = $('#ai-open'); const panel = $('#ai-panel'); const close = $('#ai-close'); const form = $('#ai-form'); const input = $('#ai-message'); const chat = $('#ai-chat'); const keyInput = $('#ai-key'); const model = $('#ai-model'); const send = $('#ai-send'); const KEY_NAME = 'sakura-note-deepseek-key'; const MODEL_NAME = 'sakura-note-deepseek-model';
  keyInput.value = localStorage.getItem(KEY_NAME) || ''; model.value = localStorage.getItem(MODEL_NAME) || 'deepseek-chat';
  const addBubble = (text, type = 'assistant') => { const node = document.createElement('div'); node.className = `ai-bubble ${type}`; node.textContent = text; chat.appendChild(node); chat.scrollTop = chat.scrollHeight; return node; };
  open.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); }); close.addEventListener('click', () => { panel.hidden = true; }); keyInput.addEventListener('change', () => localStorage.setItem(KEY_NAME, keyInput.value.trim())); model.addEventListener('change', () => localStorage.setItem(MODEL_NAME, model.value));
  form.addEventListener('submit', async (event) => { event.preventDefault(); const apiKey = keyInput.value.trim(); const message = input.value.trim(); if (!apiKey) return addBubble('先在上面填入你的 DeepSeek API Key 哦～', 'error'); if (!message) return; input.value = ''; addBubble(message, 'user'); send.disabled = true; const loading = addBubble('正在思考中…'); try { const response = await fetch('/api/deepseek', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-deepseek-key': apiKey }, body: JSON.stringify({ model: model.value, messages: [{ role: 'system', content: '你是一个温柔、简洁、友好的二次元博客小助手。请用中文回答。' }, ...Array.from(chat.querySelectorAll('.ai-bubble')).slice(-8).filter((node) => !node.classList.contains('error')).map((node) => ({ role: node.classList.contains('user') ? 'user' : 'assistant', content: node.textContent })), { role: 'user', content: message }] }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || `请求失败：${response.status}`); loading.remove(); addBubble(data.choices?.[0]?.message?.content || '我暂时没有想好怎么回答呢～'); } catch (error) { loading.remove(); addBubble(`连接失败：${error.message}\n请检查 API Key、模型和网络设置。`, 'error'); } finally { send.disabled = false; input.focus(); } });
}

$('#year').textContent = new Date().getFullYear(); loadTheme(); loadPosts().catch(() => { $('#post-list').innerHTML = '<div class="empty-card">手帐本暂时打不开，请检查服务器状态。</div>'; }); loadGuestbook().catch(() => {}); initDeepSeekChat();
