# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chromegg is a Chrome extension (Manifest V3) that scans web form fields for secrets using the GitGuardian API. It provides real-time visual feedback (red borders) when secrets are detected in form fields before submission.

## Development Commands

### Testing
```bash
npm test                    # Run all tests with Jest
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report (90%+ coverage target)
```

To run a single test file:
```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest src/scanner.test.js
```

### Linting and Formatting
```bash
npm run lint                # Check code with ESLint
npm run lint:fix            # Auto-fix ESLint issues
npm run format              # Format code with Prettier
npm run format:check        # Check formatting
```

### Building
```bash
npm run build               # Full build: lint + test + copy + browser transform
npm run build:copy          # Copy source files to dist/
npm run build:browser       # Strip ES module exports for browser compatibility
npm run clean               # Remove dist/ folder
```

### Loading in Chrome
After building, load the extension:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### Testing the Extension
- `test-page.html` - Basic form with various input types for functional testing
- `test-massive-page.html` - Stress test with 2,000 fields (~2MB) to test chunking and performance

## Architecture

### Message Flow and CORS Handling
Chrome extensions face CORS restrictions when making API calls from content scripts. The architecture routes all GitGuardian API requests through a background service worker:

```
Content Script (content.js)
  → chrome.runtime.sendMessage()
    → Background Worker (background.js)
      → GitGuardian API
        → Response back through chain
```

Content scripts cannot directly call external APIs due to CORS. The background service worker acts as a proxy.

### Content Script Injection Order
Content scripts are injected in specific order (defined in manifest.json):
1. `logger.js` - Must be first (provides global logging)
2. `chunker.js` - YAML chunking utilities
3. `scanner.js` - GitGuardian API scanner class
4. `content.js` - Main content script (uses logger, chunker, scanner)

This order matters because later scripts depend on globals from earlier ones.

### Chunking and API Endpoints
The scanner uses two GitGuardian endpoints:

- `/v1/scan` - Single document (when content < 1MB)
- `/v1/multiscan` - Multiple documents (when content requires chunking)

Chunking logic (in `chunker.js`):
- Splits YAML content by field entries when total size > 1MB
- Each chunk maintains field ID tracking
- Scanner aggregates results from all chunks

### Build Process
The build has a critical browser compatibility step:

1. **Copy files** - Source files copied to `dist/`
2. **Strip exports** - `scripts/build-for-browser.js` removes ES module exports from files that will be loaded as content scripts

Chrome content scripts cannot use ES module exports (they run in page context, not as modules). The build script transforms:
```javascript
export class Foo { }  →  class Foo { }
export function bar() { }  →  function bar() { }
```

### Testing Strategy
Tests use Jest with jsdom environment. Key patterns:

- **ES Modules**: Jest runs with `NODE_OPTIONS='--experimental-vm-modules'`
- **Chrome APIs**: Mocked in tests (chrome.runtime, chrome.storage)
- **Coverage exclusions**: background.js and options.js excluded (not easily testable with jsdom)

## Two Operating Modes

The extension supports two modes (configured in options page):

1. **Manual Mode** (default) - Scan triggered by clicking extension icon
2. **Continuous Mode** - Auto-scan on field blur events

This affects when `FieldTracker.scanFields()` is called in content.js.

## Key Classes

- **FieldTracker** (content.js) - Tracks form fields, triggers scans, updates borders
- **GitGuardianScanner** (scanner.js) - Handles API communication via background worker
- **ContentChunker** (chunker.js) - Splits large YAML content into API-compatible chunks

## Git Workflow

Use conventional commits for semantic versioning:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `test:` - Tests
- `ci:` - CI/CD changes
- `chore:` - Maintenance

Pre-commit hooks (Husky + lint-staged) automatically run ESLint and Prettier on staged files.
