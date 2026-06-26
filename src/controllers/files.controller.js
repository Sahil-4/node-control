const filesService = require('../services/files.service');
const logger = require('../services/logger.service');

function listFiles(req, res, next) {
  try {
    res.json(filesService.listFiles());
  } catch (error) {
    next(error);
  }
}

function uploadFile(req, res, next) {
  const ip = req.clientIp || req.ip || '-';
  try {
    if (!req.file) {
      const error = new Error('File is required');
      error.statusCode = 400;
      throw error;
    }

    logger.log('FILE_UPLOAD', ip, `name=${req.file.filename} size=${req.file.size}`);
    res.status(201).json({
      name: req.file.filename,
      size: req.file.size,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`
    });
  } catch (error) {
    next(error);
  }
}

function deleteFile(req, res, next) {
  const ip = req.clientIp || req.ip || '-';
  try {
    filesService.deleteFile(req.params.name);
    logger.log('FILE_DELETE', ip, `name=${req.params.name}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFiles,
  uploadFile,
  deleteFile
};
