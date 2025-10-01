// Simple SVG-based icon generator for Chrome extension
// Run with: node src/icons/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG template for the egg icon
const createEggSVG = (size) =>
  `
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="eggGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4caf50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2e7d32;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Egg shape -->
  <ellipse cx="64" cy="70" rx="40" ry="50" fill="url(#eggGradient)" stroke="#1b5e20" stroke-width="3"/>
  <!-- Highlight -->
  <ellipse cx="55" cy="55" rx="12" ry="18" fill="white" opacity="0.3"/>
  <!-- Text badge -->
  <text x="64" y="76" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
        text-anchor="middle" fill="white" stroke="#1b5e20" stroke-width="1">A</text>
</svg>
`.trim();

// Convert SVG to data URL for basic PNG export simulation
// Note: For actual PNG conversion, you'd need a library like sharp or canvas
// For Chrome extension purposes, we'll create SVG files and note that Chrome supports SVG icons

const sizes = [16, 48, 128];

sizes.forEach((size) => {
  const svg = createEggSVG(size);
  const filename = path.join(__dirname, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  // eslint-disable-next-line no-console
  console.log(`Created ${filename}`);
});

// eslint-disable-next-line no-console
console.log(
  '\nNote: SVG icons created. For actual PNG files, use an SVG to PNG converter.'
);
// eslint-disable-next-line no-console
console.log('Chrome extensions support SVG icons in manifest v3.');
// eslint-disable-next-line no-console
console.log('\nFor production, convert these to PNG using:');
// eslint-disable-next-line no-console
console.log('- Online tools like cloudconvert.com');
// eslint-disable-next-line no-console
console.log('- Command line tools like Inkscape or ImageMagick');
// eslint-disable-next-line no-console
console.log('- Node packages like sharp');
