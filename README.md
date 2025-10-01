# Chromegg

A Chrome extension that displays an "activated" badge when you focus on input fields. Built with TDD (Test-Driven Development) and security best practices.

## Features

- Shows a green "activated" badge above focused input fields
- Works with text inputs, textareas, and contenteditable elements
- Lightweight and unobtrusive
- Built with security in mind (minimal permissions, CSP, no external dependencies)
- Comprehensive test coverage

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd chromegg
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Build the extension:
   ```bash
   npm run build
   ```

5. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

### For Production

Download from the Chrome Web Store (link coming soon).

## Development

### Project Structure

```
chromegg/
├── src/
│   ├── badge.js         # BadgeManager class for badge UI
│   ├── badge.test.js    # Tests for BadgeManager
│   ├── badge.css        # Badge styling
│   ├── content.js       # Content script for field tracking
│   ├── content.test.js  # Tests for FieldTracker
│   └── icons/           # Extension icons
├── manifest.json        # Extension manifest (Manifest V3)
├── package.json         # NPM configuration
├── jest.config.js       # Jest test configuration
├── eslint.config.js     # ESLint configuration
└── .prettierrc          # Prettier configuration
```

### Available Scripts

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code quality with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run build` - Build extension (lint + test + copy files)
- `npm run clean` - Remove dist folder

### Testing

This project follows Test-Driven Development (TDD) principles. All core functionality is tested:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Code Quality

The project uses multiple tools to ensure code quality:

- **ESLint** - Static code analysis with security-focused rules
- **Prettier** - Consistent code formatting
- **Husky** - Pre-commit hooks
- **lint-staged** - Run linters on staged files only

Before each commit, Husky automatically:
1. Runs ESLint and auto-fixes issues
2. Formats code with Prettier

### Security Features

This extension follows Chrome extension security best practices:

1. **Minimal Permissions** - No special permissions required
2. **Content Security Policy** - Strict CSP to prevent XSS attacks
3. **No External Dependencies** - All code is self-contained
4. **Manifest V3** - Uses the latest, more secure manifest version
5. **No Eval or Inline Scripts** - All code is in external files
6. **Input Sanitization** - Proper handling of user input
7. **Read-only Access** - Extension only reads DOM, doesn't modify user data

## How It Works

1. **Field Detection** - Content script monitors focus/blur events on all pages
2. **Badge Creation** - When a trackable field is focused, a badge is created and positioned
3. **Position Tracking** - Badge position updates on scroll/resize to follow the field
4. **Cleanup** - Badge is hidden when field loses focus

### Trackable Fields

The extension shows badges for:
- `<input>` elements (type: text, email, password, search, tel, url, number, date, etc.)
- `<textarea>` elements
- Elements with `contenteditable="true"`

Does NOT track:
- Buttons
- Checkboxes
- Radio buttons
- Disabled or readonly fields

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT

## Acknowledgments

Built with Chrome Extension Manifest V3 and modern web standards.
