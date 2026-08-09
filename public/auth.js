const { $, t, request, errorMessage, setHint } = window.Sakura;

function showAuthUser(user) {
  const link = $('#auth-link');
  if (link && user) { link.textContent = user.name || user.email; link.href = '/auth.html'; }
}
async function loadCurrentUser() {
  try { showAuthUser((await request('/api/auth/me')).user); }
  catch (error) { console.warn('Unable to load current user', error); }
}
async function submitAuth(form, mode) {
  const hint = $('#auth-hint'); const button = form.querySelector('button[type="submit"]');
  button.disabled = true; setHint(hint, t('common.loading'));
  try { await request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); location.href = '/'; }
  catch (error) { setHint(hint, errorMessage(error), true); }
  finally { button.disabled = false; }
}
async function setupGoogleSignIn() {
  const button = $('#google-button'); const hint = $('#google-hint');
  if (!button) return;
  try {
    const { googleClientId } = await request('/api/auth/config');
    if (!googleClientId) return setHint(hint, t('auth.googleUnavailable'));
    const render = () => {
      if (!window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          button.style.opacity = '0.6'; setHint(hint, t('auth.googleLoading'));
          try { await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }); location.href = '/'; }
          catch (error) { button.style.opacity = ''; setHint(hint, error.message, true); }
        }
      });
      window.google.accounts.id.renderButton(button, { theme: 'outline', size: 'large', text: 'signin_with', width: 320 });
      return true;
    };
    if (render()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (render() || ++attempts >= 40) { clearInterval(timer); if (attempts >= 40 && !window.google?.accounts?.id) setHint(hint, t('auth.googleLoadFailed'), true); }
    }, 250);
  } catch (error) { setHint(hint, error.message, true); }
}
function initAuthPage() {
  const form = $('#auth-form');
  if (!form) return;
  let mode = 'login';
  const name = $('#auth-name'); const title = $('#auth-title'); const subtitle = $('#auth-subtitle'); const submit = $('#auth-submit'); const switchText = $('#switch-text'); const switchButton = $('#switch-mode');
  const renderMode = () => {
    const register = mode === 'register';
    name.hidden = !register; name.required = register;
    title.textContent = register ? t('auth.registerTitle') : t('auth.loginTitle');
    subtitle.textContent = register ? t('auth.registerSubtitle') : t('auth.loginSubtitle');
    submit.textContent = register ? t('auth.register') : t('auth.login');
    switchText.textContent = register ? '已经有账号？' : '还没有账号？';
    switchButton.textContent = register ? '去登录' : '注册一个';
    $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
  };
  switchButton.addEventListener('click', () => { mode = mode === 'login' ? 'register' : 'login'; renderMode(); setHint('#auth-hint', ''); });
  form.addEventListener('submit', (event) => { event.preventDefault(); submitAuth(form, mode); });
  window.addEventListener('sakura:locale-change', renderMode);
  renderMode(); setupGoogleSignIn();
}
loadCurrentUser();
initAuthPage();
