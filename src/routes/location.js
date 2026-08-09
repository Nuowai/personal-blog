const express = require('express');
const { AppError, asyncHandler } = require('../http');

function createLocationRouter({ config }) {
  const router = express.Router();

  router.get('/location-config', (req, res) => res.json({
    amapJsKey: config.amapJsKey,
    securityJsCode: config.amapSecurityCode
  }));

  router.get('/weather', asyncHandler(async (req, res) => {
    if (!config.amapWebKey) throw new AppError(503, 'WEATHER_NOT_CONFIGURED', '天气服务未配置');
    const city = String(req.query.city || '110000').replace(/[^0-9]/g, '').slice(0, 12);
    const upstream = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${encodeURIComponent(config.amapWebKey)}&city=${encodeURIComponent(city)}&extensions=base`, {
      signal: AbortSignal.timeout(10000)
    });
    const data = await upstream.json();
    if (!upstream.ok) throw new AppError(502, 'WEATHER_UPSTREAM_ERROR', '天气查询失败');
    res.json(data);
  }));

  return router;
}

module.exports = { createLocationRouter };
