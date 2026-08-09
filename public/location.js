const { $, t, request, setHint } = window.Sakura;
const widget = $('#location-widget');
let map;
let currentCity = '110000';

function setLocationText(message) { const node = $('#location-info'); if (node) node.textContent = message; }
function setWeatherText(message) { const node = $('#weather-info'); if (node) node.textContent = message; }
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = true; script.onload = resolve; script.onerror = () => reject(new Error('地图脚本加载失败')); document.head.appendChild(script);
  });
}
async function loadWeather(city = currentCity) {
  currentCity = city || currentCity;
  setWeatherText(t('weather.loading'));
  try {
    const data = await request(`/api/weather?city=${encodeURIComponent(currentCity)}`);
    if (data.code && data.code !== '1') throw new Error(data.info || '天气查询失败');
    const weather = data.lives?.[0];
    setWeatherText(weather ? `${weather.city} · ${weather.weather} · ${weather.temperature}℃ · ${weather.winddirection}${weather.windpower}级` : t('weather.notConfigured'));
  } catch (error) { setWeatherText(error.message || t('weather.notConfigured')); }
}
async function initMap() {
  if (!widget) return;
  setLocationText(t('location.loading'));
  try {
    const config = await request('/api/location-config');
    if (!config.amapJsKey) { setLocationText(t('location.notConfigured')); return loadWeather(); }
    window._AMapSecurityConfig = { securityJsCode: config.securityJsCode || '' };
    await loadScript(`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.amapJsKey)}&plugin=AMap.Geolocation`);
    map = new window.AMap.Map('amap-map', { zoom: 4, center: [116.397428, 39.90923] });
    const geolocation = new window.AMap.Geolocation({ enableHighAccuracy: true, timeout: 8000, buttonPosition: 'RB' });
    map.addControl(geolocation);
    geolocation.getCurrentPosition((status, result) => {
      if (status === 'complete') {
        const city = result.addressComponent?.city || result.addressComponent?.province || '当前地点';
        currentCity = result.addressComponent?.adcode || currentCity;
        setLocationText(city);
        if (result.position) map.setCenter(result.position);
        loadWeather(currentCity);
      } else {
        setLocationText('定位失败，使用默认城市');
        loadWeather();
      }
    });
  } catch (error) { setLocationText(error.message || t('location.notConfigured')); loadWeather(); }
}
$('#location-refresh')?.addEventListener('click', initMap);
window.addEventListener('sakura:locale-change', () => { if (!map) { setLocationText(t('location.notConfigured')); setWeatherText(t('weather.notConfigured')); } });
initMap();
