// Logger is available globally from logger.js (loaded first in manifest)
/* global logger */

class BadgeManager {
  constructor() {
    this.badge = null;
    this.currentTarget = null;
    this.scrollHandler = null;
    this.resizeHandler = null;
  }

  createBadge() {
    if (this.badge) {
      return this.badge;
    }

    this.badge = document.createElement('div');
    this.badge.className = 'chromegg-badge';
    this.badge.textContent = 'activated';
    this.badge.setAttribute('role', 'status');
    this.badge.setAttribute('aria-live', 'polite');

    return this.badge;
  }

  showBadge(targetElement) {
    if (!targetElement) {
      return;
    }

    this.currentTarget = targetElement;

    if (!this.badge) {
      this.createBadge();
    }

    if (!document.body.contains(this.badge)) {
      document.body.appendChild(this.badge);
    }

    this.updateBadgePosition();
    this.badge.style.display = 'block';

    this.scrollHandler = () => this.updateBadgePosition();
    this.resizeHandler = () => this.updateBadgePosition();

    window.addEventListener('scroll', this.scrollHandler, true);
    window.addEventListener('resize', this.resizeHandler);
  }

  updateBadgePosition() {
    if (!this.currentTarget || !this.badge) {
      return;
    }

    const rect = this.currentTarget.getBoundingClientRect();

    this.badge.style.position = 'fixed';
    this.badge.style.top = `${rect.top - 25}px`;
    this.badge.style.left = `${rect.left}px`;
    this.badge.style.zIndex = '2147483647';
  }

  hideBadge() {
    if (this.badge) {
      this.badge.style.display = 'none';
    }
    this.currentTarget = null;

    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  cleanup() {
    this.hideBadge();

    if (this.badge && document.body.contains(this.badge)) {
      document.body.removeChild(this.badge);
    }

    this.badge = null;
  }
}

class FieldTracker {
  constructor(scanner = null, options = {}) {
    this.badgeManager = new BadgeManager();
    this.scanner = scanner;
    this.focusHandler = null;
    this.changeHandler = null;
    this.scannedFields = new Map(); // Track scan results per field
    this.continuousMode =
      options.continuousMode !== undefined ? options.continuousMode : false;
    this.autoRedact =
      options.autoRedact !== undefined ? options.autoRedact : true;
    this.redactText = options.redactText || 'REDACTED';
  }

  isTrackableField(element) {
    if (!element || !element.tagName) {
      return false;
    }

    if (element.disabled || element.readOnly) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();

    if (tagName === 'textarea') {
      return true;
    }

    if (tagName === 'input') {
      const trackableTypes = [
        'text',
        'email',
        'password',
        'search',
        'tel',
        'url',
        'number',
        'date',
        'datetime-local',
        'month',
        'time',
        'week',
      ];
      const type = (element.type || 'text').toLowerCase();
      return trackableTypes.includes(type);
    }

    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    return false;
  }

  handleFocus(_event) {
    // Badge removed - no action on focus
  }

  handleChange(event) {
    // Only trigger scan on change if in continuous mode
    if (
      this.continuousMode &&
      this.scanner &&
      event.target &&
      this.isTrackableField(event.target)
    ) {
      this.scanField(event.target);
    }
  }

  /**
   * Collect all form field values on the page and combine into single document
   * @returns {Object} Single document object with combined form data in YAML format
   */
  collectFormData() {
    const fields = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, [contenteditable="true"]'
    );

    const yamlFields = [];
    const fieldMap = new Map();
    const fieldLineMap = new Map(); // Track which lines each field occupies

    fields.forEach((field, index) => {
      if (!this.isTrackableField(field)) {
        return;
      }

      const value =
        field.contentEditable === 'true'
          ? field.textContent || ''
          : field.value || '';

      if (!value.trim()) {
        return; // Skip empty fields
      }

      // Generate and set unique identifier
      const fieldId = this.getFieldIdentifier(field, index);
      field.setAttribute('data-gg-id', fieldId);

      // Store field reference for later
      fieldMap.set(fieldId, field);

      // Track line numbers for this field
      // Calculate which lines this field will occupy in the YAML
      const currentLineCount = yamlFields.reduce((count, f) => {
        return count + f.value.split('\n').length + 2; // +2 for field_id line and value: | line
      }, 0);

      const startLine = currentLineCount + 1; // +1 because GitGuardian uses 1-based line numbers
      const valueLines = value.split('\n').length;
      const endLine = startLine + valueLines + 1; // +1 for the "value: |" line

      fieldLineMap.set(fieldId, {
        startLine: startLine,
        endLine: endLine,
        valueStartLine: startLine + 2, // First line of actual value content
      });

      // Add to YAML structure with multiline format
      yamlFields.push({
        id: fieldId,
        value: value,
      });
    });

    if (yamlFields.length === 0) {
      return null;
    }

    // Create YAML document with multiline string format
    let yamlDocument = '';
    yamlFields.forEach((field) => {
      yamlDocument += `- field_id: ${field.id}\n`;
      yamlDocument += `  value: |\n`;
      // Indent each line of the value with 4 spaces
      const indentedValue = field.value
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      yamlDocument += indentedValue + '\n';
    });

    return {
      document: yamlDocument,
      filename: `form_data_${Date.now()}.yaml`,
      fieldMap: fieldMap,
      fieldLineMap: fieldLineMap,
    };
  }

  /**
   * Generate a unique identifier for a field
   * @param {HTMLElement} field - The field element
   * @param {number} index - Field index
   * @returns {string} Unique identifier
   */
  getFieldIdentifier(field, index) {
    // Try to use field name, id, or placeholder as identifier
    const name =
      field.name || field.id || field.placeholder || `field_${index}`;
    const tagName = field.tagName.toLowerCase();
    const type = field.type ? `_${field.type}` : '';

    return `${tagName}${type}_${name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Scan all fields on the page for secrets
   */
  async scanAllFields() {
    if (!this.scanner) {
      return;
    }

    try {
      // Collect all form data into single document
      const formData = this.collectFormData();

      if (!formData) {
        return;
      }

      logger.warn('Scanning with formData:', formData);

      // Scan the combined document
      const result = await this.scanner.scanContent(formData);

      logger.warn('Scan result received:', result);

      // Update borders for all scanned fields
      this.updateFieldBorders(result, formData.fieldMap, formData.fieldLineMap);
    } catch (error) {
      logger.error('Error scanning fields:', error);
      // On error, don't apply any styling
    }
  }

  /**
   * Scan a specific field for secrets
   * @param {HTMLElement} field - The field to scan
   */
  async scanField(_field) {
    // Just call scanAllFields since we scan all fields together anyway
    return this.scanAllFields();
  }

  /**
   * Update field borders based on scan results
   * @param {Object} scanResult - GitGuardian scan result
   * @param {Map} fieldMap - Map of field IDs to field elements
   * @param {Map} fieldLineMap - Map of field IDs to their line ranges in YAML
   */
  updateFieldBorders(scanResult, fieldMap, fieldLineMap) {
    logger.warn('updateFieldBorders called with:', {
      scanResult,
      fieldMap,
      fieldLineMap,
    });

    if (!scanResult) {
      logger.warn('No scan result, returning early');
      return;
    }

    // Handle both single document response and multi-document response
    // Single document: { policy_breaks: [...], policy_break_count: 0 }
    // Multi document: { scan_results: [{ policy_breaks: [...] }] }
    // Chunked scan: { policy_breaks: [...], _chunkFieldIds: [...] } (already combined)
    let policyBreaks;
    if (scanResult.policy_breaks !== undefined) {
      // Single document OR chunked scan (already combined by scanner.js)
      policyBreaks = scanResult.policy_breaks || [];
    } else if (scanResult.scan_results && scanResult.scan_results.length > 0) {
      // Multi-document response (not chunked - just multiple files)
      policyBreaks = scanResult.scan_results[0].policy_breaks || [];
    } else {
      logger.warn('No policy_breaks found in response');
      return;
    }

    logger.warn('Policy breaks found:', policyBreaks.length);

    // Build a cache of field values to avoid repeated DOM queries
    const fieldValueCache = new Map();
    for (const [fieldId, field] of fieldMap.entries()) {
      const value =
        field.contentEditable === 'true'
          ? field.textContent || ''
          : field.value || '';
      fieldValueCache.set(fieldId, value);
    }

    // Extract field IDs that have secrets and their matches
    const fieldsWithSecrets = new Map(); // fieldId -> matches[]
    policyBreaks.forEach((policyBreak, idx) => {
      const matches = policyBreak.matches || [];
      // Get chunk field IDs if this came from a chunked scan
      const chunkFieldIds = policyBreak._chunkFieldIds || null;

      logger.warn(
        `Policy break ${idx}: ${matches.length} matches, chunkFieldIds: ${chunkFieldIds ? chunkFieldIds.length : 'none'}`
      );

      matches.forEach((match) => {
        // Parse the match to find which field it belongs to
        const fieldId = this.findFieldIdForMatch(
          match,
          fieldLineMap,
          chunkFieldIds,
          fieldValueCache
        );
        logger.warn(
          `Match "${match.match?.substring(0, 20)}..." mapped to fieldId: ${fieldId}`
        );
        if (fieldId) {
          if (!fieldsWithSecrets.has(fieldId)) {
            fieldsWithSecrets.set(fieldId, []);
          }
          fieldsWithSecrets.get(fieldId).push(match);
        }
      });
    });

    logger.warn('Fields with secrets:', Array.from(fieldsWithSecrets.keys()));
    logger.warn('FieldMap size:', fieldMap.size);
    logger.warn(
      'Sample fieldMap keys:',
      Array.from(fieldMap.keys()).slice(0, 5)
    );
    logger.warn(
      'Sample fieldsWithSecrets keys:',
      Array.from(fieldsWithSecrets.keys()).slice(0, 5)
    );

    // Use fieldMap directly instead of querying ALL fields on page
    // This avoids massive DOM queries and only updates fields that were scanned
    logger.warn('Starting field border updates...');
    let redCount = 0;
    let greenCount = 0;

    // Batch DOM updates for performance
    const BATCH_SIZE = 100;
    const fieldEntries = Array.from(fieldMap.entries());
    let currentBatch = 0;

    const processBatch = () => {
      const start = currentBatch * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, fieldEntries.length);

      for (let i = start; i < end; i++) {
        const [fieldId, field] = fieldEntries[i];
        const hasSecret = fieldsWithSecrets.has(fieldId);

        if (hasSecret) {
          // Secret found - red border
          redCount++;
          if (redCount <= 3) {
            logger.warn(`RED border #${redCount}: fieldId="${fieldId}"`);
          }
          field.classList.add('chromegg-secret-found');
          field.classList.remove('chromegg-no-secret');
          this.scannedFields.set(field, { hasSecret: true });

          // Apply redaction if enabled
          this.applyRedaction(field, fieldsWithSecrets.get(fieldId));
        } else {
          // No secret - green border
          greenCount++;
          field.classList.add('chromegg-no-secret');
          field.classList.remove('chromegg-secret-found');
          this.scannedFields.set(field, { hasSecret: false });
        }
      }

      currentBatch++;
      if (end < fieldEntries.length) {
        // More batches to process
        requestAnimationFrame(processBatch);
      } else {
        logger.warn(
          `Border updates complete: ${redCount} RED, ${greenCount} GREEN`
        );
      }
    };

    // Start processing batches
    processBatch();
  }

  /**
   * Find which field a match belongs to
   * @param {Object} match - GitGuardian match object with line_start/line_end
   * @param {Map} fieldLineMap - Map of field IDs to their line ranges
   * @param {Array} chunkFieldIds - Field IDs from the chunk (if using chunked scan)
   * @returns {string|null} Field ID or null
   */
  findFieldIdForMatch(
    match,
    fieldLineMap,
    chunkFieldIds = null,
    fieldValueCache = null
  ) {
    // If we have chunk field IDs, the match came from a chunked scan
    // In this case, we can't use line numbers (they're relative to chunk)
    // Instead, we search for the match text in fields from this chunk
    if (chunkFieldIds && chunkFieldIds.length > 0) {
      const matchText = match.match || '';

      // Try to find which field in this chunk contains the match
      for (const fieldId of chunkFieldIds) {
        // Use cache if available to avoid DOM queries
        let fieldValue;
        if (fieldValueCache && fieldValueCache.has(fieldId)) {
          fieldValue = fieldValueCache.get(fieldId);
        } else {
          const field = document.querySelector(`[data-gg-id="${fieldId}"]`);
          if (field) {
            fieldValue =
              field.contentEditable === 'true'
                ? field.textContent || ''
                : field.value || '';
          }
        }

        if (fieldValue && fieldValue.includes(matchText)) {
          return fieldId;
        }
      }

      return null;
    }

    // Non-chunked scan: use line numbers from GitGuardian
    const matchLineStart = match.line_start;
    const matchLineEnd = match.line_end;

    if (!matchLineStart) {
      logger.warn('Match has no line_start:', match);
      return null;
    }

    // Find the field whose line range contains this match
    for (const [fieldId, lineInfo] of fieldLineMap.entries()) {
      // Check if the match lines fall within this field's value range
      if (
        matchLineStart >= lineInfo.valueStartLine &&
        matchLineEnd <= lineInfo.endLine
      ) {
        logger.warn(
          `Match on lines ${matchLineStart}-${matchLineEnd} belongs to field ${fieldId} (lines ${lineInfo.startLine}-${lineInfo.endLine})`
        );
        return fieldId;
      }
    }

    logger.warn(
      `No field found for match on lines ${matchLineStart}-${matchLineEnd}`
    );
    return null;
  }

  /**
   * Apply redaction to a field based on detected matches
   * @param {HTMLElement} field - The field element
   * @param {Array} matches - Array of match objects from GitGuardian with line/index positions
   */
  applyRedaction(field, matches) {
    logger.warn('applyRedaction called with:', {
      autoRedact: this.autoRedact,
      matchCount: matches ? matches.length : 0,
      field: field,
      matches: matches,
    });

    if (!this.autoRedact || !matches || matches.length === 0) {
      logger.warn('Skipping redaction:', {
        autoRedact: this.autoRedact,
        hasMatches: !!matches,
        matchCount: matches ? matches.length : 0,
      });
      return;
    }

    logger.warn('Applying redaction to field:', field, matches);

    let fieldValue =
      field.contentEditable === 'true'
        ? field.textContent || ''
        : field.value || '';

    // Split field value into lines for line-based redaction
    const lines = fieldValue.split('\n');
    logger.warn('Field has', lines.length, 'lines');

    // Collect all positions to redact
    // Since we're working with multiline content, we need to calculate absolute positions
    const positions = [];

    matches.forEach((match) => {
      // GitGuardian provides match string and positions
      // The match.match is the actual secret text found
      const matchText = match.match || '';

      // Find ALL occurrences of this secret in the field value
      let searchIndex = 0;
      while (searchIndex < fieldValue.length) {
        const idx = fieldValue.indexOf(matchText, searchIndex);
        if (idx === -1) {
          break; // No more occurrences
        }

        positions.push({
          start: idx,
          end: idx + matchText.length,
          text: matchText,
        });
        logger.warn(
          `Found match "${matchText}" at position ${idx}-${idx + matchText.length}`
        );

        // Continue searching after this match
        searchIndex = idx + matchText.length;
      }
    });

    logger.warn(`Found ${positions.length} positions to redact`);

    // Sort by position descending to replace from end to start
    // This prevents index shifting issues
    positions.sort((a, b) => b.start - a.start);

    // Apply redactions
    positions.forEach((pos) => {
      fieldValue =
        fieldValue.substring(0, pos.start) +
        this.redactText +
        fieldValue.substring(pos.end);

      logger.warn(
        `Redacted secret "${pos.text}" from ${pos.start} to ${pos.end}`
      );
    });

    // Update field value
    if (field.contentEditable === 'true') {
      field.textContent = fieldValue;
    } else {
      field.value = fieldValue;
    }
  }

  init() {
    this.focusHandler = (event) => this.handleFocus(event);
    this.changeHandler = (event) => this.handleChange(event);

    document.addEventListener('focus', this.focusHandler, true);
    document.addEventListener('change', this.changeHandler, true);
  }

  cleanup() {
    if (this.focusHandler) {
      document.removeEventListener('focus', this.focusHandler, true);
      this.focusHandler = null;
    }

    if (this.changeHandler) {
      document.removeEventListener('change', this.changeHandler, true);
      this.changeHandler = null;
    }

    this.badgeManager.cleanup();
  }
}

// Initialize the field tracker when the script loads
// Only activate if both API URL and API key are set
// GitGuardianScanner is loaded from scanner.js (included before this script in manifest)
if (
  typeof window !== 'undefined' &&
  !window.chromeggtesting &&
  typeof chrome !== 'undefined'
) {
  chrome.storage.sync.get(
    ['apiUrl', 'apiKey', 'continuousMode', 'autoRedact', 'redactText'],
    (result) => {
      if (
        result.apiUrl &&
        result.apiUrl.trim() &&
        result.apiKey &&
        result.apiKey.trim()
      ) {
        // Create scanner instance (GitGuardianScanner is globally available from scanner.js)
        if (typeof GitGuardianScanner !== 'undefined') {
          const scanner = new GitGuardianScanner(result.apiUrl, result.apiKey);
          const options = {
            continuousMode:
              result.continuousMode !== undefined
                ? result.continuousMode
                : false,
            autoRedact:
              result.autoRedact !== undefined ? result.autoRedact : true,
            redactText: result.redactText || 'REDACTED',
          };
          const tracker = new FieldTracker(scanner, options);
          tracker.init();

          // Only auto-scan on page load if in continuous mode
          if (options.continuousMode) {
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                logger.warn(
                  'DOMContentLoaded - scanning all fields (continuous mode)'
                );
                tracker.scanAllFields();
              });
            } else {
              // DOM already loaded, scan immediately
              logger.warn(
                'DOM already loaded - scanning all fields immediately (continuous mode)'
              );
              tracker.scanAllFields();
            }
          } else {
            logger.warn(
              'Manual mode enabled - waiting for extension button click'
            );
          }

          // Expose tracker globally for manual scans
          globalThis.chromeggTracker = tracker;
        } else {
          logger.error('GitGuardianScanner not available');
          // Fall back to tracker without scanner
          const tracker = new FieldTracker();
          tracker.init();
        }
      }
    }
  );
}

// Listen for manual scan requests from extension icon click
if (
  typeof window !== 'undefined' &&
  !window.chromeggtesting &&
  typeof chrome !== 'undefined' &&
  chrome.runtime
) {
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.action === 'manualScan') {
      logger.warn('Manual scan requested via extension icon click');
      if (globalThis.chromeggTracker) {
        globalThis.chromeggTracker.scanAllFields();
      } else {
        logger.error('Tracker not initialized - cannot perform manual scan');
      }
    }
  });
}

// Export for tests - make classes available on globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.BadgeManager = BadgeManager;
  globalThis.FieldTracker = FieldTracker;
}
