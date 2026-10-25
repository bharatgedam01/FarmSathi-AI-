// FarmSaathi AI — Weather API Route
// Proxies Open-Meteo forecasts and provides resilient Indian agricultural weather fallbacks.

const url = require('url');
const weatherService = require('../services/weatherService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const query = req.query || parsedUrl.query || {};

  const city = query.city || query.location || 'Gadchiroli';
  const lat = query.lat;
  const lon = query.lon;

  const result = await weatherService.getWeatherData({ city, lat, lon });

  if (res.writeHead) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'public, max-age=600' });
    res.end(JSON.stringify(result));
  } else {
    res.status(200).json(result);
  }
};
