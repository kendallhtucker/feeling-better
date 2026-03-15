// Run this once to generate PWA icons: node generate-icons.js
// Requires: npm install canvas (one-time)
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  // White text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(size * 0.35)}px "Times New Roman", Times, serif`;
  ctx.fillText('FB', size / 2, size / 2);

  writeFileSync(`public/${filename}`, canvas.toBuffer('image/png'));
  console.log(`Created ${filename}`);
}

generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');
