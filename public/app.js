const { $, t, escapeHtml, safeUrl, formatDate, request, errorMessage, setHint, initSiteSettings } = window.Sakura;
let activeTag = '';
let searchTimer;
let postsController;

const themes = ['sakura', 'night', 'mint', 'lavender'];

function applyTheme(theme) {
  const chosen = themes.includes(theme) ? theme : 'sakura';
  document.body.dataset.theme = chosen;
  const toggle = $('#theme-toggle');
  if (toggle) toggle.textContent = chosen === 'night' ? '🌙' : chosen === 'mint' ? '🌿' : chosen === 'lavender' ? '💜' : '🌸';
}

function renderTagFilters(posts) {
  const node = $('#tag-filters');
  if (!node) return;
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))].slice(0, 8);
  node.innerHTML = tags.map((tag) => `<button class="tag-filter ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}" type="button">#${escapeHtml(tag)}</button>`).join('');
}

function renderPosts(posts) {
  const list = $('#post-list');
  if (!list) return;
  list.innerHTML = posts.length ? posts.map((post) => {
    const image = safeUrl(post.cover_image);
    return `<a class="post-card" href="/post.html?slug=${encodeURIComponent(post.slug)}"><div class="post-cover">${image ? `<img src="${escapeHtml(image)}" alt="">` : escapeHtml(post.cover_emoji)}</div><div><div class="post-meta">${escapeHtml(post.category)} · ${formatDate(post.created_at)}</div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || t('post.noExcerpt'))}</p><div class="post-tags">${(post.tags || []).slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('')}</div></div><span class="read-more">→</span></a>`;
  }).join('') : `<div class="empty-card">${escapeHtml(t('post.empty'))}</div>`;
}

async function loadPosts() {
  postsController?.abort();
  const controller = new AbortController();
  postsController = controller;
  const query = new URLSearchParams();
  const keyword = $('#search-input')?.value.trim();
  if (keyword) query.set('q', keyword);
  if (activeTag) query.set('tag', activeTag);
  const data = await request(`/api/posts?${query}`, { signal: controller.signal });
  $('#post-count').textContent = `${data.posts.length} ${t('common.notes')}`;
  renderTagFilters(data.posts);
  renderPosts(data.posts);
}
function isAbortError(error) {
  return error?.name === 'AbortError';
}
function handleRequestError(selector, error) {
  if (!isAbortError(error)) setHint(selector, errorMessage(error), true);
}async function loadGuestbook() {
  const data = await request('/api/guestbook');
  const list = $('#guestbook-list');
  if (!list) return;
  list.innerHTML = data.messages.length ? data.messages.slice(0, 3).map((item) => `<div class="guest-message"><strong>${escapeHtml(item.nickname)}</strong><p>${escapeHtml(item.message)}</p></div>`).join('') : `<div class="form-hint">${escapeHtml(t('guestbook.empty'))}</div>`;
}

function initGuestbook() {
  const form = $('#guestbook-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    setHint('#guestbook-hint', t('common.loading'));
    try {
      await request('/api/guestbook', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset();
      setHint('#guestbook-hint', t('guestbook.success'));
      await loadGuestbook();
    } catch (error) {
      setHint('#guestbook-hint', errorMessage(error), true);
    } finally { button.disabled = false; }
  });
}

function initDeepSeekChat() {
  const open = $('#ai-open'); const panel = $('#ai-panel'); const close = $('#ai-close'); const form = $('#ai-form');
  const input = $('#ai-message'); const chat = $('#ai-chat'); const keyInput = $('#ai-key'); const model = $('#ai-model'); const send = $('#ai-send');
  if (![open, panel, close, form, input, chat, keyInput, model, send].every(Boolean)) return;
  const messages = [];
  const keyName = 'sakura-note-deepseek-key'; const modelName = 'sakura-note-deepseek-model';
  keyInput.value = sessionStorage.getItem(keyName) || '';
  model.value = sessionStorage.getItem(modelName) || 'deepseek-chat';
  const addBubble = (text, type = 'assistant') => { const node = document.createElement('div'); node.className = `ai-bubble ${type}`; node.textContent = text; chat.appendChild(node); chat.scrollTop = chat.scrollHeight; return node; };
  open.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
  close.addEventListener('click', () => { panel.hidden = true; });
  keyInput.addEventListener('change', () => sessionStorage.setItem(keyName, keyInput.value.trim()));
  model.addEventListener('change', () => sessionStorage.setItem(modelName, model.value));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const apiKey = keyInput.value.trim(); const message = input.value.trim();
    if (!apiKey) return addBubble(t('ai.noKey'), 'error');
    if (!message || send.disabled) return;
    input.value = ''; messages.push({ role: 'user', content: message }); addBubble(message, 'user'); send.disabled = true;
    const loading = addBubble(t('ai.thinking')); 
    try {
      const data = await request('/api/deepseek', { method: 'POST', headers: { 'x-deepseek-key': apiKey }, body: JSON.stringify({ model: model.value, messages: [{ role: 'system', content: 'You are a concise, friendly blog assistant.' }, ...messages.slice(-8)], max_tokens: 1024, temperature: 0.8 }) });
      loading.remove();
      const answer = data.choices?.[0]?.message?.content || t('common.networkError');
      messages.push({ role: 'assistant', content: answer }); addBubble(answer);
    } catch (error) {
      loading.remove(); addBubble(errorMessage(error), 'error');
    } finally { send.disabled = false; input.focus(); }
  });
}

function initHome() {
  $('#theme-toggle')?.addEventListener('click', () => applyTheme(themes[(themes.indexOf(document.body.dataset.theme) + 1) % themes.length]));
  $('#search-form')?.addEventListener('submit', (event) => { event.preventDefault(); activeTag = ''; loadPosts().catch((error) => handleRequestError('#post-list', error)); });
  $('#search-input')?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadPosts().catch((error) => setHint('#post-list', error.message, true)), 300); });
  $('#tag-filters')?.addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; activeTag = button.dataset.tag; loadPosts().catch((error) => setHint('#post-list', error.message, true)); });
  initSiteSettings().then((settings) => applyTheme(settings?.theme || 'sakura')).catch((error) => { applyTheme('sakura'); handleRequestError('#post-list', error); });
  loadPosts().catch((error) => setHint('#post-list', error.message, true));
  loadGuestbook().catch((error) => handleRequestError('#guestbook-list', error));
  initGuestbook();
  initDeepSeekChat();
}

initHome();
