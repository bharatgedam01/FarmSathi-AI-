const { handler } = require('../netlify/functions/status');

module.exports = async (_req, res) => {
  const result = await handler();

  res.status(result.statusCode);
  for (const [name, value] of Object.entries(result.headers || {})) {
    res.setHeader(name, value);
  }
  res.send(result.body || '');
};