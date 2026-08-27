const express = require('express');
const net = require('node:net');
const { AppError, asyncHandler, rateLimit } = require('../http');

const DEFAULT_PROVIDER = 'DeepSeek';
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 169 && parts[1] === 254);
}

function normalizeBaseUrl(value, config) {
  let url;
  try { url = new URL(String(value || DEFAULT_BASE_URL).trim()); } catch { throw new AppError(400, 'AI_INVALID_BASE_URL', 'AI Base URL 格式不正确'); }
  const isHttp = url.protocol === 'http:';
  if (!['http:', 'https:'].includes(url.protocol) || (isHttp && config.nodeEnv === 'production')) {
    throw new AppError(400, 'AI_INVALID_BASE_URL', '生产环境只支持 HTTPS 的 AI Base URL');
  }
  const hostname = url.hostname.toLowerCase();
  if (config.nodeEnv === 'production' && (BLOCKED_HOSTS.has(hostname) || net.isIP(hostname) && (isPrivateIpv4(hostname) || hostname === '::1') || hostname.endsWith('.local'))) {
    throw new AppError(400, 'AI_INVALID_BASE_URL', 'AI Base URL 不允许指向本机或内网地址');
  }
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '');
  if (!/\/v1$/i.test(url.pathname)) url.pathname += '/v1';
  return url.toString().replace(/\/$/, '');
}

function normalizeMessages(value) {
  if (!Array.isArray(value) || !value.length) throw new AppError(400, 'AI_MESSAGES_REQUIRED', '消息不能为空');
  const messages = value.slice(-24).map((message) => {
    if (!message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      throw new AppError(400, 'AI_INVALID_MESSAGE', '消息格式不正确');
    }
    return { role: message.role, content: message.content.trim().slice(0, 12000) };
  }).filter((message) => message.content);
  if (!messages.length) throw new AppError(400, 'AI_MESSAGES_REQUIRED', '消息不能为空');
  if (messages.reduce((total, message) => total + message.content.length, 0) > 120000) {
    throw new AppError(400, 'AI_CONTEXT_TOO_LARGE', '对话上下文过长，请清理历史后重试');
  }
  return messages;
}

function createAiRouter({ config }) {
  const router = express.Router();
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

  router.get('/ai/config', (req, res) => res.json({
    provider: config.aiProvider || DEFAULT_PROVIDER,
    baseUrl: config.aiBaseUrl || DEFAULT_BASE_URL,
    model: config.aiModel || DEFAULT_MODEL
  }));

  router.post('/ai/chat', limiter, asyncHandler(async (req, res) => {
    const apiKey = String(req.headers['x-ai-key'] || '').trim();
    if (!apiKey) throw new AppError(400, 'AI_KEY_REQUIRED', '请先填写 AI API Key');
    const provider = String(req.body?.provider || DEFAULT_PROVIDER).trim().slice(0, 80) || DEFAULT_PROVIDER;
    const baseUrl = normalizeBaseUrl(req.body?.base_url, config);
    const model = String(req.body?.model || DEFAULT_MODEL).trim().slice(0, 120);
    if (!model) throw new AppError(400, 'AI_MODEL_REQUIRED', '请填写 AI 模型名称');
    const messages = normalizeMessages(req.body?.messages);
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
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
    let data;
    try { data = await upstream.json(); } catch { data = null; }
    if (!upstream.ok || !data) {
      throw new AppError(upstream.status === 429 ? 429 : 502, 'AI_UPSTREAM_ERROR', `${provider} 服务暂时不可用`);
    }
    res.json({ ...data, sakura: { provider, model } });
  }));

  return router;
}

module.exports = { createAiRouter, normalizeBaseUrl, normalizeMessages };
