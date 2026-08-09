(function () {
  const dictionaries = {
    'zh-CN': {
      'common.networkError': '网络请求失败，请稍后再试',
      'common.loading': '加载中…',
      'common.locale': 'English',
      'common.notes': '篇记录',
      'nav.home': '首页', 'nav.about': '关于我', 'nav.guestbook': '留言板', 'nav.write': '写文章', 'nav.backHome': '回到首页',
      'home.eyebrow': '正在和世界交换一点点温柔', 'home.heroTitle': '你好呀，<br><em>欢迎来到我的小宇宙。</em>', 'home.heroDescription': '这里收藏生活碎片、技术折腾和那些悄悄发光的瞬间。愿你路过时，刚好被一阵樱花风吹到。', 'home.recent': '最近写了什么', 'home.searchPlaceholder': '搜索文章、标签或关键词…', 'home.aboutKicker': 'A LITTLE ABOUT ME', 'home.aboutTitle': '小樱 / Sakura', 'home.aboutText': '会写代码，也会在下午三点认真吃一块小蛋糕。喜欢把复杂的事情变简单，把普通的日子过得有一点可爱。', 'home.guestKicker': 'SAY HELLO', 'home.guestTitle': '留下一个脚印', 'home.guestText': '路过的话，和我说句话吧～', 'home.nickname': '你的昵称', 'home.message': '想说些什么呢？', 'home.aiTitle': 'DeepSeek 小助手',
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
      'location.failed': '定位失败，使用默认城市',
      'weather.loading': '天气信息加载中…',
      'weather.notConfigured': '站点未配置天气服务',
      'errors.ADMIN_NOT_CONFIGURED': '管理员尚未配置',
      'errors.ADMIN_UNAUTHORIZED': '管理员密钥不正确',
      'errors.DEEPSEEK_KEY_REQUIRED': '请先填写 DeepSeek API Key',
      'errors.DEEPSEEK_MESSAGES_REQUIRED': '消息不能为空',
      'errors.DEEPSEEK_UPSTREAM_ERROR': 'DeepSeek 服务暂时不可用',
      'errors.EMAIL_EXISTS': '该邮箱已注册',
      'errors.GOOGLE_NOT_CONFIGURED': 'Google 登录尚未配置',
      'errors.INTERNAL_ERROR': '服务器内部错误',
      'errors.INVALID_CREDENTIALS': '邮箱或密码不正确',
      'errors.INVALID_EMAIL': '邮箱格式不正确',
      'errors.INVALID_GOOGLE_CREDENTIAL': 'Google 登录凭证无效',
      'errors.INVALID_PASSWORD': '密码长度需要在 8 到 200 个字符之间',
      'errors.INVALID_SETTING': '网站设置格式不正确',
      'errors.INVALID_THEME': '主题无效',
      'errors.MEDIA_NOT_FOUND': '媒体文件没有找到',
      'errors.MEDIA_REQUIRED': '请选择支持的媒体文件',
      'errors.MEDIA_TOO_LARGE': '媒体文件超过大小限制',
      'errors.NOT_FOUND': '请求资源不存在',
      'errors.POST_NOT_FOUND': '文章没有找到',
      'errors.RATE_LIMITED': '请求过于频繁，请稍后再试',
      'errors.VALIDATION_ERROR': '提交内容不符合要求',
      'errors.WEATHER_NOT_CONFIGURED': '天气服务尚未配置',
      'errors.WEATHER_UPSTREAM_ERROR': '天气服务暂时不可用',
      'errors.MEDIA_TYPE_NOT_ALLOWED': '媒体类型或扩展名不受支持',
      'errors.INVALID_MEDIA_PATH': '媒体路径无效',
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
      'nav.home': 'Home', 'nav.about': 'About', 'nav.guestbook': 'Guestbook', 'nav.write': 'Write', 'nav.backHome': 'Back home',
      'home.eyebrow': 'Exchanging a little tenderness with the world', 'home.heroTitle': 'Hello,<br><em>welcome to my little universe.</em>', 'home.heroDescription': 'A collection of life fragments, technical experiments, and quietly glowing moments. May a breeze of sakura find you here.', 'home.recent': 'Recent notes', 'home.searchPlaceholder': 'Search posts, tags, or keywords…', 'home.aboutKicker': 'A LITTLE ABOUT ME', 'home.aboutTitle': 'Sakura', 'home.aboutText': 'I write code and take cake seriously at three in the afternoon. I like making complex things simple and ordinary days a little cute.', 'home.guestKicker': 'SAY HELLO', 'home.guestTitle': 'Leave a footprint', 'home.guestText': 'If you are passing by, say hello～', 'home.nickname': 'Your name', 'home.message': 'What would you like to say?', 'home.aiTitle': 'DeepSeek assistant',
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
      'location.failed': 'Location failed. Using the default city.',
      'weather.loading': 'Loading weather…',
      'weather.notConfigured': 'Weather service is not configured',
      'errors.ADMIN_NOT_CONFIGURED': 'Administrator access is not configured.',
      'errors.ADMIN_UNAUTHORIZED': 'The administrator token is incorrect.',
      'errors.DEEPSEEK_KEY_REQUIRED': 'Enter a DeepSeek API key first.',
      'errors.DEEPSEEK_MESSAGES_REQUIRED': 'Message content is required.',
      'errors.DEEPSEEK_UPSTREAM_ERROR': 'DeepSeek is temporarily unavailable.',
      'errors.EMAIL_EXISTS': 'This email is already registered.',
      'errors.GOOGLE_NOT_CONFIGURED': 'Google sign-in is not configured.',
      'errors.INTERNAL_ERROR': 'The server encountered an internal error.',
      'errors.INVALID_CREDENTIALS': 'The email or password is incorrect.',
      'errors.INVALID_EMAIL': 'The email format is invalid.',
      'errors.INVALID_GOOGLE_CREDENTIAL': 'The Google credential is invalid.',
      'errors.INVALID_PASSWORD': 'Password must be between 8 and 200 characters.',
      'errors.INVALID_SETTING': 'The site setting is invalid.',
      'errors.INVALID_THEME': 'The selected theme is invalid.',
      'errors.MEDIA_NOT_FOUND': 'Media file not found.',
      'errors.MEDIA_REQUIRED': 'Choose a supported media file.',
      'errors.MEDIA_TOO_LARGE': 'The media file is too large.',
      'errors.MEDIA_TYPE_NOT_ALLOWED': 'The media type or extension is not supported.',
      'errors.INVALID_MEDIA_PATH': 'The media path is invalid.',
      'errors.NOT_FOUND': 'The requested resource was not found.',
      'errors.POST_NOT_FOUND': 'Post not found.',
      'errors.RATE_LIMITED': 'Too many requests. Please try again later.',
      'errors.VALIDATION_ERROR': 'The submitted data is invalid.',
      'errors.WEATHER_NOT_CONFIGURED': 'Weather service is not configured.',
      'errors.WEATHER_UPSTREAM_ERROR': 'Weather service is temporarily unavailable.',
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
  function errorMessage(error, fallback = 'common.networkError') {
    const key = error?.code ? `errors.${error.code}` : fallback;
    const translated = t(key);
    return translated === key ? t(fallback) : translated;
  }
  function applyStaticTranslations() {
    $('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    $('[data-i18n-html]').forEach((node) => { node.innerHTML = t(node.dataset.i18nHtml); });
    $('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  }
  function applySiteSettings(settings = {}) {
    if (settings.theme) document.body.dataset.theme = settings.theme;
    const iconUrl = safeUrl(settings.faviconUrl);
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    if (iconUrl) icon.href = iconUrl;
    else icon.removeAttribute('href');

    const wallpaperUrl = safeUrl(settings.wallpaperUrl);
    document.body.classList.toggle('custom-wallpaper', Boolean(wallpaperUrl));
    document.body.style.setProperty('--custom-wallpaper-image', wallpaperUrl ? `url("${wallpaperUrl.replace(/["\\\\)]/g, '')}")` : '');
    document.querySelectorAll('.video-bg').forEach((video) => { video.style.opacity = wallpaperUrl ? '0' : ''; });

    const genericTitles = new Set(['', 'Sakura Note · 樱花汽水日记', '文章 · Sakura Note', 'Article · Sakura Note', '写文章 · Sakura Note', 'Write · Sakura Note', '登录 / 注册 · Sakura Note', 'Login / Register · Sakura Note']);
    if (settings.siteTitle && genericTitles.has(document.title)) document.title = settings.siteTitle;

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    if (settings.siteDescription) description.content = settings.siteDescription;
  }
  let siteSettingsPromise;
  function initSiteSettings() {
    if (!siteSettingsPromise) {
      siteSettingsPromise = request('/api/settings').then((settings) => {
        applySiteSettings(settings);
        return settings;
      });
    }
    return siteSettingsPromise;
  }
  function setLocale(locale) {
    state.locale = locale === 'en' ? 'en' : 'zh-CN';
    localStorage.setItem('sakura-note-locale', state.locale);
    document.documentElement.lang = state.locale;
    applyStaticTranslations();
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
  window.Sakura = { $, $$, t, escapeHtml, safeUrl, formatDate, request, RequestError, errorMessage, setHint, setLocale, initLocale, initSiteSettings, getLocale: () => state.locale };
  initLocale();
  initSiteSettings().catch((error) => { document.documentElement.dataset.settingsError = 'true'; console.error('Site settings failed to load', error); });
})();
