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
  constructor(scanner = null) {
    this.badgeManager = new BadgeManager();
    this.scanner = scanner;
    this.focusHandler = null;
    this.blurHandler = null;
    this.scannedFields = new Map(); // Track scan results per field
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

  handleBlur(event) {
    // Trigger scan on blur if scanner is configured
    if (this.scanner && event.target && this.isTrackableField(event.target)) {
      this.scanField(event.target);
    }
  }

  /**
   * Collect all form field values on the page and combine into single document
   * @returns {Object} Single document object with combined form data
   */
  collectFormData() {
    const fields = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, [contenteditable="true"]'
    );

    let combinedContent = '';
    const fieldMap = new Map();

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

      // Add to combined document with identifier
      combinedContent += `\n### FIELD: ${fieldId} ###\n${value}\n`;
    });

    if (combinedContent.trim() === '') {
      return null;
    }

    return {
      document: combinedContent,
      filename: `form_data_${Date.now()}.txt`,
      fieldMap: fieldMap,
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
   * Scan a specific field for secrets
   * @param {HTMLElement} field - The field to scan
   */
  async scanField(_field) {
    if (!this.scanner) {
      return;
    }

    try {
      // Collect all form data into single document
      const formData = this.collectFormData();

      if (!formData) {
        return;
      }

      // Logging disabled for production - use for debugging:
      // console.warn('Scanning with formData:', formData);

      // Scan the combined document
      const result = await this.scanner.scanContent(formData);

      // Logging disabled for production - use for debugging:
      // console.warn('Scan result received:', result);

      // Update borders for all scanned fields
      this.updateFieldBorders(result, formData.fieldMap);
    } catch (error) {
      console.error('Error scanning field:', error);
      // On error, don't apply any styling
    }
  }

  /**
   * Update field borders based on scan results
   * @param {Object} scanResult - GitGuardian scan result
   * @param {Map} fieldMap - Map of field IDs to field elements
   */
  updateFieldBorders(scanResult, fieldMap) {
    // Logging disabled for production - use for debugging:
    // console.warn('updateFieldBorders called with:', { scanResult, fieldMap });

    if (!scanResult) {
      // Logging disabled for production - use for debugging:
      // console.warn('No scan result, returning early');
      return;
    }

    // Handle both single document response and multi-document response
    // Single document: { policy_breaks: [...], policy_break_count: 0 }
    // Multi document: { scan_results: [{ policy_breaks: [...] }] }
    let policyBreaks;
    if (scanResult.scan_results && scanResult.scan_results.length > 0) {
      // Multi-document response
      policyBreaks = scanResult.scan_results[0].policy_breaks || [];
    } else if (scanResult.policy_breaks !== undefined) {
      // Single document response
      policyBreaks = scanResult.policy_breaks || [];
    } else {
      // Logging disabled for production - use for debugging:
      // console.warn('No policy_breaks found in response');
      return;
    }

    // Logging disabled for production - use for debugging:
    // console.warn('Policy breaks found:', policyBreaks.length);

    // Extract field IDs that have secrets
    const fieldsWithSecrets = new Set();
    policyBreaks.forEach((policyBreak) => {
      const matches = policyBreak.matches || [];
      matches.forEach((match) => {
        // Parse the match to find which field it belongs to
        // The match contains line numbers or the actual content
        const fieldId = this.findFieldIdForMatch(match, fieldMap);
        // Logging disabled for production - use for debugging:
        // console.warn('Match found, mapped to fieldId:', fieldId);
        if (fieldId) {
          fieldsWithSecrets.add(fieldId);
        }
      });
    });

    // Logging disabled for production - use for debugging:
    // console.warn('Fields with secrets:', Array.from(fieldsWithSecrets));
    // console.warn('FieldMap size:', fieldMap.size);

    // Get all trackable fields on the page (not just the ones with content)
    const allFields = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, [contenteditable="true"]'
    );

    // Update all trackable fields based on scan results
    allFields.forEach((field, index) => {
      if (!this.isTrackableField(field)) {
        return;
      }

      const fieldId =
        field.getAttribute('data-gg-id') ||
        this.getFieldIdentifier(field, index);
      // Logging disabled for production - use for debugging:
      // console.warn('Processing field:', fieldId, field);

      const value =
        field.contentEditable === 'true'
          ? field.textContent || ''
          : field.value || '';

      // Logging disabled for production - use for debugging:
      // console.warn('Field value:', value.substring(0, 50));

      if (!value.trim()) {
        // Empty fields - clear border
        // Logging disabled for production - use for debugging:
        // console.warn('Empty field, clearing border');
        field.style.border = '';
        field.classList.remove('chromegg-secret-found', 'chromegg-no-secret');
        return;
      }

      if (fieldsWithSecrets.has(fieldId)) {
        // Secret found - red border
        // Logging disabled for production - use for debugging:
        // console.warn('Applying RED border to:', fieldId);
        field.classList.add('chromegg-secret-found');
        field.classList.remove('chromegg-no-secret');
        this.scannedFields.set(field, { hasSecret: true });
      } else {
        // No secret - green border
        // Logging disabled for production - use for debugging:
        // console.warn('Applying GREEN border to:', fieldId);
        field.classList.add('chromegg-no-secret');
        field.classList.remove('chromegg-secret-found');
        this.scannedFields.set(field, { hasSecret: false });
      }
    });
  }

  /**
   * Find which field a match belongs to based on the combined document structure
   * @param {Object} match - GitGuardian match object
   * @param {Map} fieldMap - Map of field IDs to field elements
   * @returns {string|null} Field ID or null
   */
  findFieldIdForMatch(match, fieldMap) {
    // The match object contains the actual matched content
    // We need to find which field contains this content
    const matchContent = match.match || '';

    for (const [fieldId, field] of fieldMap.entries()) {
      const fieldValue =
        field.contentEditable === 'true'
          ? field.textContent || ''
          : field.value || '';

      if (fieldValue.includes(matchContent)) {
        return fieldId;
      }
    }

    return null;
  }

  init() {
    this.focusHandler = (event) => this.handleFocus(event);
    this.blurHandler = (event) => this.handleBlur(event);

    document.addEventListener('focus', this.focusHandler, true);
    document.addEventListener('blur', this.blurHandler, true);
  }

  cleanup() {
    if (this.focusHandler) {
      document.removeEventListener('focus', this.focusHandler, true);
      this.focusHandler = null;
    }

    if (this.blurHandler) {
      document.removeEventListener('blur', this.blurHandler, true);
      this.blurHandler = null;
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
  chrome.storage.sync.get(['apiUrl', 'apiKey'], (result) => {
    if (
      result.apiUrl &&
      result.apiUrl.trim() &&
      result.apiKey &&
      result.apiKey.trim()
    ) {
      // Create scanner instance (GitGuardianScanner is globally available from scanner.js)
      if (typeof GitGuardianScanner !== 'undefined') {
        const scanner = new GitGuardianScanner(result.apiUrl, result.apiKey);
        const tracker = new FieldTracker(scanner);
        tracker.init();
      } else {
        console.error('GitGuardianScanner not available');
        // Fall back to tracker without scanner
        const tracker = new FieldTracker();
        tracker.init();
      }
    }
  });
}

// Export for tests - make classes available on globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.BadgeManager = BadgeManager;
  globalThis.FieldTracker = FieldTracker;
}
