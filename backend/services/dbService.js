// FarmSaathi AI — Database Service
// Re-exports persistent JSON storage manager and provides unified data access operations.

const db = require('../db');

module.exports = {
  ...db
};
