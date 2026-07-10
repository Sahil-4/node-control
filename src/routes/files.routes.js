const express = require('express');
const multer = require('multer');
const path = require('path');

const authMiddleware = require('../middleware/auth.middleware');
const filesController = require('../controllers/files.controller');
const { uploadsDir, sanitizeFilename } = require('../services/files.service');

const router = express.Router();

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    try {
      const originalName = sanitizeFilename(file.originalname);
      const finalName = `${Date.now()}-${originalName}`;
      cb(null, finalName);
    } catch (error) {
      cb(error);
    }
  }
});

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 50;

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      sanitizeFilename(path.basename(file.originalname));
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

router.use(authMiddleware);
router.get('/', filesController.listFiles);
router.post('/upload', upload.single('file'), filesController.uploadFile);
router.delete('/:name', filesController.deleteFile);

module.exports = router;
