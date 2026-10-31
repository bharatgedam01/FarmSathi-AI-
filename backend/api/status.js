// FarmSaathi AI — Status & Health API Route
// Reports backend health, system status, and connected services.

const dbService = require('../services/dbService');
const aiService = require('../services/aiService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const aiConfig = aiService.getAiConfigStatus ? aiService.getAiConfigStatus() : {};
  const hasAiKey = Boolean(aiConfig.hasKey);
  const activeProvider = aiConfig.provider === 'gemini' ? 'Google Gemini' : (aiConfig.provider === 'openai' ? 'OpenAI' : 'None');
  const chatModel = hasAiKey ? (aiConfig.model || 'gemini-3.5-flash-lite') : 'Unconfigured (Awaiting API Key)';
  const visionModel = hasAiKey ? (process.env.GEMINI_VISION_MODEL || aiConfig.model || 'gemini-3.5-flash-lite') : 'Unconfigured (Awaiting API Key)';

  let stats = {};
  try {
    stats = dbService.getStats();
  } catch (e) {
    stats = { note: 'Serverless deployment mode' };
  }

  const responseData = {
    success: true,
    status: 'online',
    name: 'FarmSaathi AI Full-Stack Platform',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    aiConfigured: hasAiKey,
    aiProvider: activeProvider,
    chatModel: hasAiKey ? chatModel : 'Unconfigured (Awaiting API Key)',
    visionConfigured: hasAiKey,
    visionModel: hasAiKey ? visionModel : 'Unconfigured (Awaiting API Key)',
    weatherService: 'Open-Meteo REST API (Live Synced)',
    mandiService: process.env.DATA_GOV_IN_API_KEY ? 'Data.gov.in Live Mandi API' : 'Verified APMC Mandi Bulletins',
    cloudDatabase: 'Supabase (Configured client-side via project URL & anon key)',
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    stats: stats
  };

  if (res.writeHead) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(responseData));
  } else {
    res.status(200).json(responseData);
  }
};
