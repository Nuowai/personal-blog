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

function initAiChat() {
  const open = $('#ai-open'); const panel = $('#ai-panel'); const close = $('#ai-close'); const form = $('#ai-form');
  const input = $('#ai-message'); const chat = $('#ai-chat'); const keyInput = $('#ai-key'); const provider = $('#ai-provider'); const baseUrl = $('#ai-base-url'); const model = $('#ai-model'); const clear = $('#ai-clear'); const send = $('#ai-send');
  if (![open, panel, close, form, input, chat, keyInput, provider, baseUrl, model, clear, send].every(Boolean)) return;

  const presets = {
    DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'] },
    OpenAI: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4.1-mini'] },
    OpenRouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'] },
    Moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
    SiliconFlow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct', models: ['Qwen/Qwen2.5-7B-Instruct'] }
  };
  const storagePrefix = 'sakura-note-ai-';
  const historyKey = `${storagePrefix}history-v1`;
  const addBubble = (text, type = 'assistant') => { const node = document.createElement('div'); node.className = `ai-bubble ${type}`; node.textContent = text; chat.appendChild(node); chat.scrollTop = chat.scrollHeight; return node; };
  const readHistory = () => { try { const value = JSON.parse(sessionStorage.getItem(historyKey) || '[]'); return Array.isArray(value) ? value.filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item.content === 'string').slice(-24) : []; } catch { return []; } };
  const saveHistory = () => sessionStorage.setItem(historyKey, JSON.stringify(messages.slice(-24)));
  const messages = readHistory();
  const renderHistory = () => { chat.innerHTML = ''; if (!messages.length) addBubble(t('ai.welcome')); else messages.forEach((message) => addBubble(message.content, message.role)); };
  const updateModels = (selected = '') => {
    const list = $('#ai-models');
    const options = presets[provider.value]?.models || [];
    if (list) list.innerHTML = options.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
    if (selected) model.value = selected;
  };
  const applyPreset = () => {
    const preset = presets[provider.value];
    if (!preset) return;
    baseUrl.value = preset.baseUrl;
    model.value = preset.model;
    updateModels();
  };
  open.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
  close.addEventListener('click', () => { panel.hidden = true; });
  clear.addEventListener('click', () => { messages.splice(0, messages.length); saveHistory(); renderHistory(); input.focus(); });
  provider.addEventListener('change', () => { if (presets[provider.value]) applyPreset(); sessionStorage.setItem(`${storagePrefix}provider`, provider.value); sessionStorage.setItem(`${storagePrefix}base-url`, baseUrl.value.trim()); sessionStorage.setItem(`${storagePrefix}model`, model.value.trim()); });
  const configPromise = request('/api/ai/config').then((config) => {
    const current = Object.entries(presets).find(([, preset]) => preset.baseUrl === config.baseUrl);
    provider.value = current?.[0] || 'custom';
    baseUrl.value = config.baseUrl || presets.DeepSeek.baseUrl;
    model.value = config.model || presets.DeepSeek.model;
    updateModels();
  }).catch(() => { applyPreset(); });
  keyInput.value = sessionStorage.getItem(`${storagePrefix}key`) || '';
  provider.value = sessionStorage.getItem(`${storagePrefix}provider`) || 'DeepSeek';
  baseUrl.value = sessionStorage.getItem(`${storagePrefix}base-url`) || presets.DeepSeek.baseUrl;
  model.value = sessionStorage.getItem(`${storagePrefix}model`) || presets.DeepSeek.model;
  updateModels();
  renderHistory();
  keyInput.addEventListener('change', () => sessionStorage.setItem(`${storagePrefix}key`, keyInput.value.trim()));
  provider.addEventListener('change', () => sessionStorage.setItem(`${storagePrefix}provider`, provider.value));
  baseUrl.addEventListener('change', () => sessionStorage.setItem(`${storagePrefix}base-url`, baseUrl.value.trim()));
  model.addEventListener('change', () => sessionStorage.setItem(`${storagePrefix}model`, model.value.trim()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await configPromise;
    const apiKey = keyInput.value.trim(); const message = input.value.trim();
    if (!apiKey) return addBubble(t('ai.noKey'), 'error');
    if (!message || send.disabled) return;
    input.value = ''; messages.push({ role: 'user', content: message }); saveHistory(); addBubble(message, 'user'); send.disabled = true;
    const loading = addBubble(t('ai.thinking'));
    try {
      const data = await request('/api/ai/chat', {
        method: 'POST',
        headers: { 'x-ai-key': apiKey },
        body: JSON.stringify({
          provider: provider.value === 'custom' ? 'Custom' : provider.value,
          base_url: baseUrl.value.trim(),
          model: model.value.trim(),
          messages: [{ role: 'system', content: 'You are a concise, friendly blog assistant.' }, ...messages.slice(-24)],
          max_tokens: 1024,
          temperature: 0.8
        })
      });
      loading.remove();
      const answer = data.choices?.[0]?.message?.content || t('common.networkError');
      messages.push({ role: 'assistant', content: answer }); saveHistory(); addBubble(answer);
    } catch (error) {
      loading.remove(); messages.pop(); saveHistory(); addBubble(errorMessage(error), 'error');
    } finally { send.disabled = false; input.focus(); }
  });
}
function initHome() {
  $('#theme-toggle')?.addEventListener('click', () => applyTheme(themes[(themes.indexOf(document.body.dataset.theme) + 1) % themes.length]));
  $('#search-form')?.addEventListener('submit', (event) => { event.preventDefault(); activeTag = ''; loadPosts().catch((error) => handleRequestError('#post-list', error)); });
  $('#search-input')?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadPosts().catch((error) => handleRequestError('#post-list', error)), 300); });
  $('#tag-filters')?.addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; activeTag = button.dataset.tag; loadPosts().catch((error) => handleRequestError('#post-list', error)); });
  initSiteSettings().then((settings) => applyTheme(settings?.theme || 'sakura')).catch((error) => { applyTheme('sakura'); handleRequestError('#post-list', error); });
  loadPosts().catch((error) => handleRequestError('#post-list', error));
  loadGuestbook().catch((error) => handleRequestError('#guestbook-list', error));
  initGuestbook();
  initAiChat();
}

initHome();
