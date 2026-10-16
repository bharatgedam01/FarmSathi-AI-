const { handler } = require('../netlify/functions/mandi');

module.exports = async (req, res) => {
  const result = await handler({
    httpMethod: req.method,
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    queryStringParameters: req.query || {}
  });

  res.status(result.statusCode);
  for (const [name, value] of Object.entries(result.headers || {})) {
    res.setHeader(name, value);
  }
  res.send(result.body || '');
};