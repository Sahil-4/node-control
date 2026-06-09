const systemService = require('../services/system.service');

async function executeAction(req, res, next) {
  try {
    const result = await systemService.runAction(req.body.action, req.body.input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  executeAction
};
