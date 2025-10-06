#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const filesToProcess = [
  'dist/badge.js',
  'dist/scanner.js',
  'dist/content.js'
];

// Process logger.js separately - remove exports for content script use
let loggerContent = fs.readFileSync('dist/logger.js', 'utf8');
loggerContent = loggerContent.replace(/^export\s+/gm, '');
loggerContent = loggerContent.replace(/^export\s*{\s*\w+\s*};?\s*$/gm, '');
fs.writeFileSync('dist/logger.js', loggerContent);
console.log('Processed dist/logger.js for content script compatibility');

// background.js is a module, so we keep its imports/exports
const contentScriptFiles = filesToProcess;

contentScriptFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Remove import and export statements for browser (content scripts don't use modules)
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  content = content.replace(/^export\s+/gm, '');
  content = content.replace(/^export\s*{\s*\w+\s*};?\s*$/gm, '');

  fs.writeFileSync(file, content);
  console.log(`Processed ${file} for browser compatibility`);
});

console.log('Build complete!');
