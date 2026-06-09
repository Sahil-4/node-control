const filesService = require('../services/files.service');

function listFiles(req, res, next) {
  try {
    res.json(filesService.listFiles());
  } catch (error) {
    next(error);
  }
}

function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('File is required');
      error.statusCode = 400;
      throw error;
    }

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
  try {
    filesService.deleteFile(req.params.name);
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
