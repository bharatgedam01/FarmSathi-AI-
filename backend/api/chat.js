// FarmSaathi AI — Chat API Route
// Handles farmer questions in English, Hindi, and Marathi with OpenAI or autonomous fallback.

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
      // Stream parse body
      let raw = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => { raw += chunk; });
        req.on('end', resolve);
        req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const message = String((body && body.message) || '').trim();
    if (!message) {
      const err = { success: false, error: 'Please enter a farming question.' };
      if (res.writeHead) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(err));
      } else {
        res.status(400).json(err);
      }
      return;
    }

    const language = body.language || 'en';
    const profile = body.profile || {};
    const history = Array.isArray(body.history) ? body.history : [];

    const result = await aiService.askChat(message, language, profile, history);

    const payload = {
      success: !result.missingConfig,
      missingConfig: Boolean(result.missingConfig),
      answer: result.answer,
      error: result.error || null,
      mode: result.mode,
      model: result.model || null
    };

    const statusCode = result.missingConfig ? 200 : 200;
    if (res.writeHead) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(statusCode).json(payload);
    }
  } catch (err) {
    console.error('Chat API Error:', err);
    const payload = {
      success: false,
      error: err.message || 'Internal AI Error. Please verify your GEMINI_API_KEY or OPENAI_API_KEY.',
      answer: `⚠️ **AI Service Error:** ${err.message || 'Unable to connect to AI model. Please verify your API key and connection.'}`
    };
    if (res.writeHead) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(500).json(payload);
    }
  }
};
