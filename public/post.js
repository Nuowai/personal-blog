const $ = (s) => document.querySelector(s);
const qp = new URLSearchParams(location.search);
const slug = qp.get('slug');
if (!slug) location.href = '/';

async function loadArticle() {
  try {
    const res = await fetch(`/api/posts/${slug}`);
    if (!res.ok) throw new Error('文章未找到');
    const { post } = await res.json();
    const emoji = post.cover_emoji || '🌸';
    const tags = (post.tags || []).map(t => `<span>#${t}</span>`).join('');
    const date = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${post.created_at.replace(' ','T')}Z`));
    document.title = `${post.title} · Sakura Note`;
    $('#article-root').innerHTML = `<article class="article-card"><header class="article-header"><span class="article-emoji">${emoji}</span><div class="article-meta">${post.category} · ${date}${tags ? `<div class="article-tags">${tags}</div>` : ''}</div><h1>${post.title}</h1></header><div class="article-content">${post.content_html}</div></article>`;
    loadComments();
  } catch (err) {
    $('#article-root').innerHTML = `<div class="empty-card">${err.message}，回首页看看别的吧～<br><a href="/">← 回到手帐首页</a></div>`;
  }
}

async function loadComments() {
  try {
    const res = await fetch(`/api/posts/${slug}/comments`);
    const { comments } = await res.json();
    const html = comments.length ? comments.map(c => `<div class="comment-item"><strong>${c.nickname}</strong><time>${new Date(`${c.created_at.replace(' ','T')}Z`).toLocaleDateString('zh-CN')}</time><p>${c.message}</p></div>`).join('') : '<div class="form-hint">还没有评论，来做第一个留言的人吧～</div>';
    $('#article-root').insertAdjacentHTML('beforeend', `<section class="comments-section"><h2>读者评论</h2><div class="comments-list">${html}</div><form id="comment-form" class="comment-form"><input name="nickname" maxlength="30" placeholder="你的昵称" required><textarea name="message" maxlength="500" rows="3" placeholder="写一点感想…" required></textarea><button class="button button-primary" type="submit">发送评论 ✨</button><div class="form-hint" id="comment-hint"></div></form></section>`);
    document.querySelector('#comment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.currentTarget; const btn = f.querySelector('button'); btn.disabled = true;
      try {
        const r = await fetch(`/api/posts/${slug}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
        if (!r.ok) throw new Error((await r.json()).error);
        f.reset(); loadComments();
      } catch (err) { document.querySelector('#comment-hint').textContent = err.message; } finally { btn.disabled = false; }
    });
  } catch {}
}

document.querySelector('.year') && (document.querySelector('.year').textContent = new Date().getFullYear());
loadArticle();
