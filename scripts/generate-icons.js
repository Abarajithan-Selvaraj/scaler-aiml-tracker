/**
 * Generates minimal valid PNG files for PWA icons using only Node.js built-ins.
 * No external dependencies required.
 */
const zlib = require('zlib');
const fs = require('fs');

// CRC32 implementation (required by PNG spec)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function makeSolidPNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, 8-bit depth, RGB color type, no compression/filter/interlace
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Raw scanlines: filter byte (0x00) + RGB pixels per row
  const row = size * 3 + 1;
  const raw = Buffer.alloc(size * row);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const o = y * row + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('./public', { recursive: true });

// Indigo #6366f1 = rgb(99, 102, 241)
fs.writeFileSync('./public/pwa-192x192.png', makeSolidPNG(192, 99, 102, 241));
fs.writeFileSync('./public/pwa-512x512.png', makeSolidPNG(512, 99, 102, 241));
console.log('✅ pwa-192x192.png generated');
console.log('✅ pwa-512x512.png generated');
