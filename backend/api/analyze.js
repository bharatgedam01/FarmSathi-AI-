// FarmSaathi AI — Crop Disease & Leaf Photo Analysis API Route
// Performs multimodal vision analysis or returns structured autonomous triage report.

const fs = require('fs');
const path = require('path');
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

    // Save uploaded image to disk for permanent reference if base64 was sent
    let savedImagePath = null;
    let savedImageUrl = null;
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      try {
        const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const extMatch = image.match(/data:image\/([a-zA-Z0-9+]+);base64/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        const cleanName = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(uploadsDir, cleanName);
        const base64Content = image.split(',')[1];
        if (base64Content) {
          fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
          savedImagePath = filePath;
          savedImageUrl = `/uploads/${cleanName}`;
        }
      } catch (saveErr) {
        console.warn('Could not save photo to disk:', saveErr.message);
      }
    }

    const result = await aiService.analyzeCropPhoto(image, 'image/jpeg', cropName, fileName, language);

    const payload = {
      success: !result.missingConfig,
      missingConfig: Boolean(result.missingConfig),
      report: result.report,
      crop: result.crop || cropName,
      imageUrl: savedImageUrl || null,
      error: result.error || null,
      mode: result.mode,
      model: result.model || null
    };

    const statusCode = 200;
    if (res.writeHead) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(statusCode).json(payload);
    }
  } catch (err) {
    console.error('Analyze API Error:', err);
    const payload = {
      success: false,
      error: err.message || 'Vision AI analysis failed. Please verify your GEMINI_API_KEY or OPENAI_API_KEY.',
      report: `⚠️ **Crop Analysis Error:** ${err.message || 'Unable to analyze image. Please ensure your AI Vision API key is configured.'}`
    };
    if (res.writeHead) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(500).json(payload);
    }
  }
};
