// FarmSaathi AI — Crop Disease & Leaf Photo Analysis API Route
// Performs multimodal vision analysis or returns structured autonomous triage report.

const aiService = require('../services/aiService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    const err = { success: false, error: 'Method not allowed. Use POST.' };
    if (res.writeHead) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err));
    } else {
      res.status(405).json(err);
    }
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    } else if (!body && req.on) {
      let raw = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => { raw += chunk; });
        req.on('end', resolve);
        req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const image = (body && (body.image || body.imageBase64 || body.photo)) || null;
    const cropName = (body && body.cropName) || '';
    const fileName = (body && body.fileName) || 'crop_leaf.jpg';
    const language = (body && body.language) || 'en';

    const result = await aiService.analyzeCropPhoto(image, 'image/jpeg', cropName, fileName, language);

    const payload = {
      success: true,
      report: result.report,
      crop: result.crop,
      mode: result.mode
    };

    if (res.writeHead) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(200).json(payload);
    }
  } catch (err) {
    console.error('Analyze API Error:', err);
    const fallback = aiService.getAutonomousCropTriage('Crop Sample', 'en', 'photo.jpg');
    const payload = { success: true, report: fallback, crop: 'Crop Sample', mode: 'fallback-error' };
    if (res.writeHead) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(200).json(payload);
    }
  }
};
