const systemService = require('../services/system.service');
const logger = require('../services/logger.service');

async function executeAction(req, res, next) {
  try {
    const result = await systemService.runAction(req.body.action, req.body.input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function readFile(req, res, next) {
  const ip = req.clientIp || req.ip || '-';
  try {
    const result = systemService.readScopedFile(req.query.path);
    logger.log('READ_FILE', ip, `path=${req.query.path}`);
    res.json(result);
  } catch (error) {
    logger.log('READ_FILE_ERR', ip, `path=${req.query.path} err=${error.message}`);
    next(error);
  }
}

function getScope(req, res) {
  res.json({ scope: systemService.getAllowedScope() });
}

module.exports = {
  executeAction,
  readFile,
  getScope
};
