// FarmSaathi AI — Mandi Prices API Route
// Serves verified APMC mandi records across all Indian states with search and filter support.

const url = require('url');
const mandiService = require('../services/mandiService');

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

  const state = query.state || '';
  const search = query.q || query.search || query.crop || '';
  const sort = query.sort || '';
  const forceRefresh = query.refresh === 'true' || query.refresh === '1';

  const result = await mandiService.queryMandiPrices({ state, query: search, sort, forceRefresh });

  if (res.writeHead) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'public, max-age=300' });
    res.end(JSON.stringify(result));
  } else {
    res.status(200).json(result);
  }
};
