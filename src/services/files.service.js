const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

function sanitizeFilename(filename) {
  const safeName = path.basename(String(filename || ''));
  if (!safeName || safeName === '.' || safeName === '..') {
    const error = new Error('Invalid filename');
    error.statusCode = 400;
    throw error;
  }

  return safeName;
}

function listFiles() {
  if (!fs.existsSync(uploadsDir)) {
    return [];
  }

  return fs.readdirSync(uploadsDir)
    .filter((name) => {
      const fullPath = path.join(uploadsDir, name);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    })
    .map((name) => {
      const fullPath = path.join(uploadsDir, name);
      const stats = fs.statSync(fullPath);
      return {
        name,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        url: `/uploads/${encodeURIComponent(name)}`
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function deleteFile(filename) {
  const safeName = sanitizeFilename(filename);
  const target = path.join(uploadsDir, safeName);

  if (!fs.existsSync(target)) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  fs.unlinkSync(target);
}

module.exports = {
  uploadsDir,
  sanitizeFilename,
  listFiles,
  deleteFile
};
