#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const filesToProcess = [
  'dist/badge.js',
  'dist/scanner.js',
  'dist/background.js'
];

filesToProcess.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove export statements for browser
  content = content.replace(/^export\s+/gm, '');
  content = content.replace(/^export\s*{\s*\w+\s*};?\s*$/gm, '');

  fs.writeFileSync(file, content);
  console.log(`Processed ${file} for browser compatibility`);
});

console.log('Build complete!');
