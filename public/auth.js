const auth$ = (selector) => document.querySelector(selector);

async function getAuthConfig() {
  const response = await fetch('/api/auth/config');
  if (!response.ok) throw new Error('登录配置加载失败');
  return response.json();
}

function showAuthUser(user) {
  const link = auth$('#auth-link');
  if (link && user) {
    link.textContent = user.name || user.email;
    link.href = '/auth.html';
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    showAuthUser(data.user);
  } catch {}
}

function setHint(node, message, error = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error', error);
}

async function submitAuth(form, mode) {
  const hint = auth$('#auth-hint');
  const button = form.querySelector('button[type="submit"]');
  const body = Object.fromEntries(new FormData(form));
  if (mode === 'register' && String(body.password).length < 8) {
    setHint(hint, '密码至少需要 8 位哦～', true);
    return;
  }
  button.disabled = true;
  setHint(hint, mode === 'register' ? '正在创建账号…' : '正在登录…');
  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '操作失败');
    window.location.href = '/';
  } catch (error) {
    setHint(hint, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function setupGoogleSignIn() {
  const button = auth$('#google-button');
  const hint = auth$('#google-hint');
  if (!button) return;
  try {
    const { googleClientId } = await getAuthConfig();
    if (!googleClientId) {
      setHint(hint, '站点尚未配置 Google 登录，请使用邮箱登录。');
      return;
    }
    const render = () => {
      if (!window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          button.style.opacity = '0.6';
          setHint(hint, '正在验证 Google 账号…');
          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Google 登录失败');
            window.location.href = '/';
          } catch (error) {
            button.style.opacity = '';
            setHint(hint, error.message, true);
          }
        }
      });
      window.google.accounts.id.renderButton(button, { theme: 'outline', size: 'large', text: 'signin_with', width: 320 });
      return true;
    };
    if (render()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (render() || ++attempts >= 40) {
        clearInterval(timer);
        if (attempts >= 40 && !window.google?.accounts?.id) setHint(hint, 'Google 登录组件加载失败，请检查网络。', true);
      }
    }, 250);
  } catch (error) {
    setHint(hint, error.message, true);
  }
}

function initAuthPage() {
  const form = auth$('#auth-form');
  if (!form) return;
  let mode = 'login';
  const name = auth$('#auth-name');
  const title = auth$('#auth-title');
  const subtitle = auth$('#auth-subtitle');
  const submit = auth$('#auth-submit');
  const switchText = auth$('#switch-text');
  const switchButton = auth$('#switch-mode');
  switchButton.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    const register = mode === 'register';
    name.hidden = !register;
    name.required = register;
    title.textContent = register ? '创建小宇宙账号' : '登录小宇宙';
    subtitle.textContent = register ? '注册后就可以留下属于你的脚印啦～' : '登录后可以留下属于你的脚印～';
    submit.textContent = register ? '注册' : '登录';
    switchText.textContent = register ? '已经有账号？' : '还没有账号？';
    switchButton.textContent = register ? '去登录' : '注册一个';
    auth$('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
    setHint(auth$('#auth-hint'), '');
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAuth(form, mode);
  });
  setupGoogleSignIn();
}

loadCurrentUser();
initAuthPage();
