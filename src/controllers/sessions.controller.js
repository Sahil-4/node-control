const sessionService = require('../services/session.service');

function listSessions(req, res) {
  res.json(sessionService.list());
}

module.exports = { listSessions };
