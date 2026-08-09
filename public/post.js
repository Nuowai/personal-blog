const { $, t, escapeHtml, formatDate, request, setHint } = window.Sakura;
const params = new URLSearchParams(location.search);
const slug = params.get('slug');
const root = $('#article-root');

function renderArticle(post) {
  const tags = (post.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('');
  root.innerHTML = `<article class="article-card"><header class="article-header"><span class="article-emoji">${escapeHtml(post.cover_emoji || '🌸')}</span><div class="article-meta">${escapeHtml(post.category)} · ${formatDate(post.created_at)}${tags ? `<div class="article-tags">${tags}</div>` : ''}</div><h1>${escapeHtml(post.title)}</h1></header><div class="article-content">${post.content_html}</div></article>`;
}

function renderComments(comments) {
  const section = document.createElement('section');
  section.className = 'comments-section';
  const items = comments.length ? comments.map((comment) => `<div class="comment-item"><strong>${escapeHtml(comment.nickname)}</strong><time>${formatDate(comment.created_at)}</time><p>${escapeHtml(comment.message)}</p></div>`).join('') : `<div class="form-hint">${escapeHtml(t('post.noComments'))}</div>`;
  section.innerHTML = `<h2>${escapeHtml(t('post.comments'))}</h2><div class="comments-list">${items}</div><form id="comment-form" class="comment-form"><input name="nickname" maxlength="30" placeholder="${escapeHtml(t('auth.loginSubtitle'))}" required><textarea name="message" maxlength="500" rows="3" placeholder="${escapeHtml(t('post.comments'))}" required></textarea><button class="button button-primary" type="submit">${escapeHtml(t('post.sendComment'))}</button><div class="form-hint" id="comment-hint"></div></form>`;
  return section;
}

async function loadComments() {
  const data = await request(`/api/posts/${encodeURIComponent(slug)}/comments`);
  const old = root.querySelector('.comments-section');
  old?.remove();
  const section = renderComments(data.comments);
  root.appendChild(section);
  section.querySelector('#comment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true;
    setHint('#comment-hint', t('common.loading'), false);
    try {
      await request(`/api/posts/${encodeURIComponent(slug)}/comments`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset(); await loadComments();
    } catch (error) { setHint('#comment-hint', error.message, true); }
    finally { button.disabled = false; }
  });
}

async function loadArticle() {
  if (!slug) { location.href = '/'; return; }
  try {
    const { post } = await request(`/api/posts/${encodeURIComponent(slug)}`);
    document.title = `${post.title} · Sakura Note`;
    renderArticle(post);
    await loadComments();
  } catch (error) {
    root.innerHTML = `<div class="empty-card">${escapeHtml(error.message || t('post.notFound'))}，<a href="/">${escapeHtml(t('common.backHome'))}</a></div>`;
  }
}

document.querySelector('.year')?.replaceChildren(String(new Date().getFullYear()));
loadArticle();
