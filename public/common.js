(function () {
  const dictionaries = {
    'zh-CN': {
      'common.networkError': '网络请求失败，请稍后再试',
      'common.loading': '加载中…',
      'common.locale': 'English',
      'common.notes': '篇记录',
      'common.backHome': '← 回到手帐首页',
      'post.notFound': '文章没有找到',
      'post.empty': '没有找到这类记录，换个关键词试试吧～',
      'post.noExcerpt': '这篇小记录还没有摘要，点进去看看吧～',
      'post.noComments': '还没有评论，来做第一个留言的人吧～',
      'post.comments': '读者评论',
      'post.sendComment': '发送评论 ✨',
      'guestbook.empty': '这里还空着，等你来点亮它～',
      'guestbook.success': '收到啦，谢谢你的脚印 ✨',
      'ai.noKey': '先在上面填入你的 DeepSeek API Key 哦～',
      'ai.thinking': '正在思考中…',
      'ai.failed': '连接失败：{message}',
      'auth.login': '登录',
      'auth.register': '注册',
      'auth.loginTitle': '登录小宇宙',
      'auth.registerTitle': '创建小宇宙账号',
      'auth.loginSubtitle': '登录后可以留下属于你的脚印～',
      'auth.registerSubtitle': '注册后就可以留下属于你的脚印啦～',
      'auth.googleLoading': '正在验证 Google 账号…',
      'auth.googleUnavailable': '站点尚未配置 Google 登录，请使用邮箱登录。',
      'auth.googleLoadFailed': 'Google 登录组件加载失败，请检查网络。',
      'location.notConfigured': '站点未配置地图服务',
      'location.loading': '正在定位附近城市…',
      'weather.loading': '天气信息加载中…',
      'weather.notConfigured': '站点未配置天气服务',
      'admin.invalidToken': '管理员密钥不正确',
      'admin.saved': '保存成功 ✨',
      'admin.deleted': '已删除。',
      'admin.uploaded': '上传成功 ✨'
    },
    en: {
      'common.networkError': 'Network request failed. Please try again.',
      'common.loading': 'Loading…',
      'common.locale': '中文',
      'common.notes': 'notes',
      'common.backHome': '← Back home',
      'post.notFound': 'Post not found',
      'post.empty': 'No matching notes were found.',
      'post.noExcerpt': 'This note has no excerpt yet. Open it to read more.',
      'post.noComments': 'No comments yet. Be the first to leave one.',
      'post.comments': 'Reader comments',
      'post.sendComment': 'Send comment ✨',
      'guestbook.empty': 'Nothing here yet. Leave the first footprint.',
      'guestbook.success': 'Received — thank you for stopping by ✨',
      'ai.noKey': 'Add your DeepSeek API key above first.',
      'ai.thinking': 'Thinking…',
      'ai.failed': 'Connection failed: {message}',
      'auth.login': 'Sign in',
      'auth.register': 'Register',
      'auth.loginTitle': 'Sign in to your little universe',
      'auth.registerTitle': 'Create your account',
      'auth.loginSubtitle': 'Sign in to leave your footprint.',
      'auth.registerSubtitle': 'Create an account to leave your footprint.',
      'auth.googleLoading': 'Verifying your Google account…',
      'auth.googleUnavailable': 'Google sign-in is not configured. Use email sign-in instead.',
      'auth.googleLoadFailed': 'Google sign-in failed to load. Check your network.',
      'location.notConfigured': 'Map service is not configured',
      'location.loading': 'Locating your nearby city…',
      'weather.loading': 'Loading weather…',
      'weather.notConfigured': 'Weather service is not configured',
      'admin.invalidToken': 'The administrator token is incorrect',
      'admin.saved': 'Saved ✨',
      'admin.deleted': 'Deleted.',
      'admin.uploaded': 'Uploaded ✨'
    }
  };
  const state = { locale: localStorage.getItem('sakura-note-locale') || (navigator.language.startsWith('en') ? 'en' : 'zh-CN') };
  function t(key, vars = {}) {
    const template = dictionaries[state.locale]?.[key] || dictionaries['zh-CN'][key] || key;
    return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
  }
  function $(selector, root = document) { return root.querySelector(selector); }
  function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }
  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function formatDate(value) {
    const date = new Date(String(value || '').replace(' ', 'T') + 'Z');
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(state.locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }
  class RequestError extends Error {
    constructor(message, code, status) { super(message); this.name = 'RequestError'; this.code = code; this.status = status; }
  }
  async function request(url, options = {}) {
    const headers = { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
    const type = response.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new RequestError(typeof data?.error === 'string' ? data.error : t('common.networkError'), data?.code, response.status);
    return data;
  }
  function setHint(selector, message, error = false) {
    const node = typeof selector === 'string' ? $(selector) : selector;
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', error);
  }
  function setLocale(locale) {
    state.locale = locale === 'en' ? 'en' : 'zh-CN';
    localStorage.setItem('sakura-note-locale', state.locale);
    document.documentElement.lang = state.locale;
    $$('#locale-toggle').forEach((node) => { node.textContent = t('common.locale'); node.title = t('common.locale'); });
    window.dispatchEvent(new CustomEvent('sakura:locale-change', { detail: { locale: state.locale } }));
  }
  let localeInitialized = false;
  function initLocale() {
    if (localeInitialized) return;
    localeInitialized = true;
    setLocale(state.locale);
    $$('#locale-toggle').forEach((node) => node.addEventListener('click', () => setLocale(state.locale === 'en' ? 'zh-CN' : 'en')));
  }
  window.Sakura = { $, $$, t, escapeHtml, safeUrl, formatDate, request, RequestError, setHint, setLocale, initLocale, getLocale: () => state.locale };
  initLocale();
})();
