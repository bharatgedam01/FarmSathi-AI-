// Serverless Handler for /api/schemes
const routes = require('../routes');

module.exports = async (req, res) => {
  return await routes.handleApiRequest(req, res);
};
