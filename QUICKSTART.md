# Quick Start Guide

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build extension
npm run build
```

## Install in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/` folder

## Try It Out

1. Navigate to any website
2. Click on any text input field
3. You'll see a green "activated" badge appear above the field
4. The badge follows the field as you scroll

## Supported Fields

- Text inputs (`<input type="text">`)
- Email, password, search, tel, url inputs
- Textareas
- Contenteditable elements
- Date/time inputs

## Development Workflow

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Auto-fixing Code Issues

```bash
npm run lint:fix
npm run format
```

### Full Build with Tests

```bash
npm run build
```

This will:
1. Run ESLint
2. Run all tests
3. Copy files to `dist/`

## Pre-commit Hooks

Pre-commit hooks are automatically set up via Husky. Before each commit:
- ESLint runs and auto-fixes issues
- Prettier formats your code

## Project Structure

```
chromegg/
├── src/
│   ├── badge.js          # Badge display logic
│   ├── badge.test.js     # Badge tests
│   ├── badge.css         # Badge styling
│   ├── content.js        # Field tracking logic
│   ├── content.test.js   # Field tracking tests
│   └── icons/            # Extension icons
├── dist/                 # Built extension (load this in Chrome)
├── manifest.json         # Extension configuration
└── package.json          # NPM configuration
```

## Security Features

- ✅ No special permissions required
- ✅ Content Security Policy enforced
- ✅ No external dependencies
- ✅ Manifest V3 (latest standard)
- ✅ Input sanitization
- ✅ Read-only access to DOM

## Troubleshooting

### Tests failing with module errors?
Make sure you have `"type": "module"` in package.json

### Extension not loading?
Check that you're loading the `dist/` folder, not the project root

### Badge not appearing?
Check the browser console for errors. Make sure the field is not disabled or readonly.

## Next Steps

- Customize the badge text in `src/badge.js`
- Modify badge styling in `src/badge.css`
- Add more field types in `src/content.js`
- Extend test coverage in `*.test.js` files
