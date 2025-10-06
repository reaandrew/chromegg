# Building Chromegg: A Chrome Extension for Real-Time Secret Detection

As developers, we've all been there. You're filling out a form on a webpage, maybe testing an API integration or setting up a new service, and you accidentally paste your production API key. By the time you realize what you've done, it's too late—the form has been submitted, and your secret is now potentially exposed in server logs, analytics tools, or worse.

Recently, I came across this exact problem in conversation—what if there was a browser extension that could detect secrets in form fields before submission? The idea was compelling, but the practical challenges were unclear. Could it work at scale? What about token usage and API costs? Would performance be acceptable on complex forms?

The best way to answer these questions was to build a prototype. That's how **Chromegg** was born—a Chrome extension that uses GitGuardian's API to scan form fields in real-time and alert you when you're about to leak a secret.

## The Problem Space

Secret leakage happens in many ways. We often think about secrets being committed to Git repositories, but web forms represent another significant attack surface. Consider these scenarios:

- Pasting API keys into support ticket forms
- Accidentally including tokens in bug reports
- Testing authentication flows with production credentials
- Filling out third-party integration forms with sensitive data

By the time you submit the form, your secret has left your machine. It might be stored in server logs, sent to analytics platforms, or even cached by the browser itself. Prevention is far better than remediation.

## The Solution: Real-Time Secret Scanning

Chromegg takes a proactive approach. Instead of scanning after submission, it monitors form fields and scans their contents **before** you submit. When you tab out of a field (on blur), the extension:

1. Collects all form field values on the page
2. Sends them to GitGuardian's API via a background service worker
3. Receives scan results identifying any secrets
4. Applies visual feedback—a red border around fields containing secrets

This gives you an immediate visual warning that you're about to leak sensitive information.

## Design Choices and Architecture

### Manifest V3 and Security First

The extension is built using Chrome's Manifest V3, which provides several security benefits over the older V2 format. Most notably, it uses a service worker instead of a persistent background page, reducing resource usage and improving security isolation.

The permissions model is intentionally minimal:
```json
"permissions": ["storage", "activeTab"],
"host_permissions": ["https://api.gitguardian.com/*"]
```

We only request storage (for API credentials) and host permissions for the GitGuardian API. No broad network access, no sensitive browser APIs—just what's needed to do the job.

### Content Security Policy

The extension includes a strict Content Security Policy (CSP) that prevents inline scripts and restricts code execution:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

This protects against XSS attacks and ensures all code comes from trusted sources.

### Background Service Worker for API Calls

One of the more interesting architectural decisions was how to handle API communication. Chrome extensions running in content scripts face CORS restrictions when making API calls. The solution? Route all GitGuardian API requests through a background service worker.

The content script sends a message to the background worker:

```javascript
chrome.runtime.sendMessage(
  {
    action: 'scanSecrets',
    documents: documents,
  },
  (response) => {
    // Handle scan results
  }
);
```

The background worker handles the actual API call, bypassing CORS restrictions entirely.

### Handling Large Forms: Chunking and the Multiscan Endpoint

One of the core viability questions was token usage and cost. Scanning every form field individually would rack up API calls quickly—imagine a form with 50 fields triggering 50 separate scans. The solution was aggregation: collect all form field values and send them in a single scan request.

This approach worked beautifully for typical forms. But what about edge cases? To stress-test the limits, I built `test-massive-page.html`, a deliberately extreme scenario that generates 2,000 text fields, each containing ~1KB of random data. This creates approximately 2MB of content that needs to be scanned.

The problem? GitGuardian's API has payload size limits. Sending 2MB in a single request would fail. This is where chunking became necessary:

```javascript
export class ContentChunker {
  static chunkDocuments(documents, maxChunkSize = 1024 * 1024) {
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const doc of documents) {
      const docSize = this.estimateDocumentSize(doc);

      if (currentSize + docSize > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(doc);
      currentSize += docSize;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
```

When content exceeds 1MB, it's automatically split into chunks. Each chunk is sent to GitGuardian's `/v1/multiscan` endpoint, which is specifically designed for batch scanning operations.

The massive form test revealed another issue: performance. Updating borders on 2,000 DOM elements simultaneously caused noticeable UI lag. The fix was batching DOM updates using `requestAnimationFrame`:

```javascript
const processBatch = () => {
  const start = currentBatch * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, fieldEntries.length);

  for (let i = start; i < end; i++) {
    const [field, fieldId] = fieldEntries[i];
    // Update field borders in batches
  }

  currentBatch++;
  if (end < fieldEntries.length) {
    requestAnimationFrame(processBatch);
  }
};
```

This spreads the work across multiple animation frames, keeping the UI responsive even when updating thousands of fields.

## Two Modes of Operation

User feedback led to an important feature addition: operating modes.

**Continuous Mode** (auto-scan): Every time you blur a field, it triggers a scan. This is great for security-conscious users who want constant protection.

**Manual Mode** (default): Scanning only happens when you click the extension icon. This reduces API calls and gives users more control over when scanning occurs.

![Extension settings showing continuous mode toggle, auto-redact options, and API configuration](screenshot-url-here)

The settings page also includes:
- API URL configuration (defaulting to `https://api.gitguardian.com`)
- Secure API key storage with masked display
- Auto-redact toggle to automatically replace detected secrets with "REDACTED"
- Customizable redaction text
- Debug mode for troubleshooting

## Visual Feedback: Keeping It Simple

Initially, I experimented with both red borders (secrets found) and green borders (clean fields). User testing revealed this was too noisy—green borders everywhere just created visual clutter.

The final design uses only red borders for fields containing secrets. Clean fields remain unchanged. This follows the principle of "silence is golden"—only alert users when there's a problem.

## Testing Strategy

The project follows Test-Driven Development (TDD) principles with 90%+ code coverage. Two test pages proved essential:

**test-page.html**: A standard form with various input types (text, email, password, textarea, contenteditable). This tests basic functionality—can we detect an AWS key in a text field? Does the border appear correctly?

**test-massive-page.html**: The stress test with 2,000 fields and ~2MB of data. This revealed the chunking requirement, the performance issues with DOM updates, and even uncovered a bug in how we were batching API requests.

Without that massive form test, these issues would have surfaced in production—probably when someone tried using the extension on a complex enterprise form.

## Prototype Findings: Is It Viable?

The prototype successfully answered the core questions around viability:

**Token Usage**: Aggregation keeps costs reasonable. A typical form with 10-20 fields becomes a single API call instead of 20 separate calls. Even the massive 2,000-field stress test only requires 2-3 chunked requests.

**Performance**: With batched DOM updates and intelligent chunking, the extension handles both simple and complex forms smoothly. The massive form test—an extreme edge case—still completes scanning and border updates in under a second.

**Real-World Usage**: Early testing reveals most secret detections are from developers accidentally using production credentials during testing. The visual red border creates an immediate "oh no" moment that prevents submission.

## What's Next

Future enhancements I'm considering:

- Offline detection for common patterns (reducing API calls)
- Support for more GitGuardian features (custom policies, ignore lists)
- Browser notification system for detected secrets
- Statistics dashboard showing secret detections over time

## Try It Yourself

Chromegg is open source and available on [GitHub](https://github.com/reaandrew/chromegg). The extension demonstrates several important concepts:

- Manifest V3 best practices
- Content script and service worker communication
- Performance optimization for large-scale DOM operations
- Real-time API integration in browser extensions
- TDD with Jest for Chrome extensions

Whether you're building Chrome extensions, integrating with security APIs, or just interested in preventing secret leakage, I hope you find the project useful.

And remember: that red border might just save you from an awkward conversation with your security team.

---

*Andy Rea is a software engineer at GitGuardian working on secret detection and security tooling.*
