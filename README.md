# 🌸 Sakura Note — 糯歪的博客

一款适合微型服务器的软萌粉色个人 Blog：Node.js 24 + Express + SQLite，单容器即可运行。

## 功能

- 粉色二次元风格首页、文章详情页、留言板
- SQLite 自动建库，首次启动自动写入示例文章
- `/admin.html` 管理文章：新建、编辑、删除、发布/草稿、标签和封面
- 媒体库支持图片、视频、音频上传；上传后可以一键插入正文
- 4 套主题：樱花汽水、星夜紫、薄荷奶绿、薰衣草
- 文章搜索、标签筛选、评论、留言板、RSS 和 sitemap
- 文章正文支持 Markdown，服务端清理 HTML
- DeepSeek 对话小窗：填写自己的 API Key
- Docker / docker compose 部署

## 本地运行

```bash
npm install
ADMIN_TOKEN=change-me npm start
```

打开 `http://localhost:3000`，后台 `http://localhost:3000/admin.html`。

管理员必须配置 `ADMIN_TOKEN`；启用 Google 登录时，再配置 `GOOGLE_CLIENT_ID`。生产环境不要使用示例密钥。

检查代码：`npm run check`；运行测试：`npm test`。
