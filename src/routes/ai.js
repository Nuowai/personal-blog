const express = require('express');
const { AppError, asyncHandler, rateLimit } = require('../http');

function createAiRouter() {
  const router = express.Router();
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

  router.get('/deepseek/models', (req, res) => res.json({ models: ['deepseek-chat', 'deepseek-reasoner'] }));

  router.post('/deepseek', limiter, asyncHandler(async (req, res) => {
    const apiKey = String(req.headers['x-deepseek-key'] || '').trim();
    if (!apiKey) throw new AppError(400, 'DEEPSEEK_KEY_REQUIRED', '请在聊天窗口输入 DeepSeek API Key');
    const model = ['deepseek-chat', 'deepseek-reasoner'].includes(req.body?.model) ? req.body.model : 'deepseek-chat';
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = rawMessages.slice(-12).map((message) => ({
      role: ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user',
      content: String(message?.content || '').slice(0, 8000)
    }));
    if (!messages.length) throw new AppError(400, 'DEEPSEEK_MESSAGES_REQUIRED', '消息不能为空');
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: Math.min(Math.max(Number(req.body?.max_tokens) || 1024, 1), 4096),
        temperature: Math.min(Math.max(Number(req.body?.temperature ?? 0.8), 0), 2)
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) throw new AppError(upstream.status === 429 ? 429 : 502, 'DEEPSEEK_UPSTREAM_ERROR', 'DeepSeek 服务暂时不可用');
    res.json(data);
  }));

  return router;
}

module.exports = { createAiRouter };
