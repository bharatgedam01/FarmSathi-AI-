// Netlify serverless function: status.js
// Reports integration health and configuration status for FarmSaathi AI.

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async () => {
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
  const chatModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      aiConfigured: hasOpenAiKey,
      chatModel: hasOpenAiKey ? chatModel : null,
      visionConfigured: hasOpenAiKey,
      visionModel: hasOpenAiKey ? visionModel : null,
      weatherService: 'Open-Meteo API (Live, No Key Required)',
      mandiService: process.env.DATA_GOV_IN_API_KEY ? 'Agmarknet / Data.gov.in Live Feed' : 'Verified APMC Mandi Bulletin Records',
      cloudDatabase: 'Supabase (Configured client-side via project URL and public anon key)'
    })
  };
};
