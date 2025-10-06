# Chromegg

A Chrome extension that scans form fields for secrets using GitGuardian API. Built with comprehensive testing and security best practices.

## Features

### Secret Detection
- **Real-time scanning** of form fields using GitGuardian API
- **Visual feedback** with red borders on fields containing detected secrets
- **Auto-redaction** option to automatically replace detected secrets with customizable text

### Operating Modes
- **Manual mode** (default) - Scan triggered by clicking extension icon
- **Continuous mode** - Automatic scanning on field value changes

### Performance & Scalability
- **Field aggregation** - Scans all fields in single API request (reduces token usage)
- **Intelligent chunking** - Automatically splits large forms (>1MB) into chunks for multiscan endpoint
- **Batched DOM updates** - Uses requestAnimationFrame for smooth UI with thousands of fields

### Configuration
- **API endpoint configuration** - Supports custom GitGuardian instances or public API
- **Secure credential storage** - API keys stored in Chrome sync storage with masked display
- **Debug mode** - Detailed console logging for troubleshooting
- **Customizable redaction text** - Configure replacement text for detected secrets

### Security & Privacy
- **Minimal permissions** - Only storage and GitGuardian API access
- **Manifest V3** - Modern, secure Chrome extension architecture
- **Content Security Policy** - Prevents XSS and ensures code integrity
- **Background service worker** - Handles API calls to bypass CORS restrictions

### Field Support
- Text inputs, email, password, search, tel, URL fields
- Textareas and contenteditable elements
- Excludes buttons, checkboxes, radio buttons, disabled/readonly fields

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

4. **Configure API settings:**
   - Click the extension icon in Chrome toolbar
   - Enter your GitGuardian API URL (default: `https://api.gitguardian.com`)
   - Enter your GitGuardian API key
   - Click "Save Settings"

5. **Test with the included test page:**
   - Open the test page in Chrome:
     ```bash
     open test-page.html
     # Or manually open: file:///path/to/chromegg/test-page.html
     ```
   - Try entering test data in the form fields:
     - **API keys**: `AKIAIOSFODNN7EXAMPLE` (AWS example)
     - **Passwords**: `MySecretPassword123!`
     - **Regular text**: `Hello World`
   - Change field values to trigger scan (in continuous mode)
   - Observe the results:
     - **Red border** 🔴 = Secret detected
     - **No border** = No secrets found

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/reaandrew/chromegg.git
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
│   ├── background.js      # Background service worker for API calls
│   ├── scanner.js         # GitGuardianScanner class
│   ├── scanner.test.js    # Tests for scanner
│   ├── content.js         # Content script for field tracking
│   ├── content.test.js    # Tests for FieldTracker
│   ├── badge.js           # BadgeManager class (legacy, not used)
│   ├── badge.test.js      # Tests for BadgeManager
│   ├── badge.css          # Styling for field borders
│   ├── options.html       # Options page UI
│   ├── options.js         # Options page logic
│   └── icons/             # Extension icons
├── test-page.html         # Test page with sample form fields
├── manifest.json          # Extension manifest (Manifest V3)
├── package.json           # NPM configuration
├── jest.config.js         # Jest test configuration
├── eslint.config.js       # ESLint configuration
├── build-for-browser.js   # Build script to strip ES exports
└── .releaserc.json        # Semantic release configuration
```

### Available Scripts

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (83%+ coverage)
- `npm run lint` - Check code quality with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run build` - Build extension (lint + test + copy files + strip exports)
- `npm run build:copy` - Copy source files to dist/
- `npm run build:browser` - Strip ES module exports for browser compatibility
- `npm run clean` - Remove dist folder

### Testing

This project maintains comprehensive test coverage with 90%+ statement and function coverage:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

Coverage thresholds:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

### Code Quality

The project uses multiple tools to ensure code quality:

- **ESLint** - Static code analysis with security-focused rules
- **Prettier** - Consistent code formatting
- **Husky** - Pre-commit hooks
- **lint-staged** - Run linters on staged files only
- **Semantic Release** - Automated versioning and releases

Before each commit, Husky automatically:
1. Runs ESLint and auto-fixes issues
2. Formats code with Prettier

### CI/CD Pipeline

GitHub Actions workflow runs on every push and PR:

1. **Initial Checks** - Linting and unit tests with coverage reporting
2. **Semgrep** - Security analysis for code vulnerabilities
3. **GitGuardian Repository History Scan** - Scans entire repository history for secrets
4. **Release** (main branch only) - Semantic versioning and changelog generation

All jobs run with concurrency control to cancel in-progress runs when new commits are pushed.

### Security Features

This extension follows Chrome extension security best practices:

1. **Minimal Permissions** - Only `storage` and GitGuardian API host permissions
2. **Content Security Policy** - Strict CSP to prevent XSS attacks
3. **Manifest V3** - Uses the latest, more secure manifest version
4. **No Eval or Inline Scripts** - All code is in external files
5. **Background Service Worker** - Handles API calls to avoid CORS
6. **API Key Storage** - Credentials stored in Chrome sync storage
7. **Secret Detection** - Scans for API keys, passwords, tokens, etc.

## How It Works

1. **Field Detection** - Content script monitors value changes on all form fields
2. **Data Collection** - On change, collects all form field values
3. **API Scanning** - Sends data to GitGuardian API via background service worker
4. **Visual Feedback** - Applies red border to fields containing detected secrets:
   - `chromegg-secret-found` - Red border for fields with secrets

### Trackable Fields

The extension scans:
- `<input>` elements (type: text, email, password, search, tel, url, etc.)
- `<textarea>` elements
- Elements with `contenteditable="true"`

Does NOT track:
- Buttons
- Checkboxes
- Radio buttons
- Disabled or readonly fields

## GitGuardian API

This extension uses the GitGuardian API for secret detection. You'll need:

1. A GitGuardian account
2. An API key from your GitGuardian dashboard
3. API URL (default: `https://api.gitguardian.com`)

Configure these in the extension options page.

## Testing with test-page.html

The included `test-page.html` provides a test environment:

1. Build and load the extension in Chrome
2. Configure your GitGuardian API credentials in the extension options
3. Open `test-page.html` in Chrome
4. Enter test data in the form fields:
   - Try entering API keys: `AKIAIOSFODNN7EXAMPLE`
   - Try passwords: `MySecretPassword123!`
   - Try regular text: `Hello World`
5. Change field values to trigger scanning
6. Observe the border colors:
   - Red = Secret detected
   - No border = No secrets found

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes using conventional commits (`git commit -m 'feat: Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Conventional Commits

This project uses conventional commits for automated versioning:

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `docs:` - Documentation changes (patch version bump)
- `test:` - Test changes (patch version bump)
- `ci:` - CI/CD changes (patch version bump)
- `chore:` - Maintenance (no version bump)
- `BREAKING CHANGE:` - Breaking change (major version bump)

## License

MIT

## Acknowledgments

- Built with Chrome Extension Manifest V3
- GitGuardian API for secret detection
- Comprehensive testing with Jest
- Semantic Release for automated versioning
