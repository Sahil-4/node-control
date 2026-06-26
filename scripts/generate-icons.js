#!/usr/bin/env node
// Generates public/icon-192.png and public/icon-512.png from the icon design.
// No external dependencies — uses only built-in Node.js modules.
// Run: node scripts/generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Background: #0d1b2e
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = 13;
    pixels[i * 4 + 1] = 27;
    pixels[i * 4 + 2] = 46;
    pixels[i * 4 + 3] = 255;
  }

  const s = size / 512;

  function blendPixel(x, y, r, g, b, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    const a = alpha / 255;
    pixels[idx]     = Math.round(pixels[idx]     * (1 - a) + r * a);
    pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - a) + g * a);
    pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - a) + b * a);
    pixels[idx + 3] = 255;
  }

  function fillCircle(cx, cy, radius, r, g, b, alpha = 255) {
    const scx = cx * s, scy = cy * s, sr = radius * s;
    const x0 = Math.max(0, Math.floor(scx - sr));
    const x1 = Math.min(size - 1, Math.ceil(scx + sr));
    const y0 = Math.max(0, Math.floor(scy - sr));
    const y1 = Math.min(size - 1, Math.ceil(scy + sr));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px - scx, dy = py - scy;
        if (dx * dx + dy * dy <= sr * sr) {
          blendPixel(px, py, r, g, b, alpha);
        }
      }
    }
  }

  function drawLine(x1, y1, x2, y2, thickness, r, g, b, alpha = 255) {
    const sx1 = x1 * s, sy1 = y1 * s, sx2 = x2 * s, sy2 = y2 * s;
    const dx = sx2 - sx1, dy = sy2 - sy1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(len * 2);
    const half = (thickness * s) / 2;
    for (let i = 0; i <= steps; i++) {
      const px = sx1 + dx * (i / steps);
      const py = sy1 + dy * (i / steps);
      const rx = Math.ceil(half);
      for (let oy = -rx; oy <= rx; oy++) {
        for (let ox = -rx; ox <= rx; ox++) {
          if (ox * ox + oy * oy <= half * half) {
            blendPixel(Math.round(px + ox), Math.round(py + oy), r, g, b, alpha);
          }
        }
      }
    }
  }

  // Connecting lines (#3b82f6 at 40% opacity)
  drawLine(256, 152, 152, 336, 16, 59, 130, 246, 102);
  drawLine(256, 152, 360, 336, 16, 59, 130, 246, 102);
  drawLine(152, 336, 360, 336, 16, 59, 130, 246, 102);

  // Top node: outer ring (#1d4ed8), inner dot (#3b82f6)
  fillCircle(256, 152, 44, 29,  78,  216);
  fillCircle(256, 152, 22, 59,  130, 246);

  // Bottom-left node: outer (#1e40af), inner (#60a5fa)
  fillCircle(152, 336, 32, 30,  64,  175);
  fillCircle(152, 336, 16, 96,  165, 250);

  // Bottom-right node: outer (#1e40af), inner (#60a5fa)
  fillCircle(360, 336, 32, 30,  64,  175);
  fillCircle(360, 336, 16, 96,  165, 250);

  // Build PNG binary
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA

  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * stride + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('Generated: public/icon-192.png, public/icon-512.png');
