// Set test flag before import
global.window = { chromeggtesting: true };

// Import logger first to make it globally available
await import('./logger.js');
const { logger } = await import('./logger.js');
global.logger = logger;

// Import content.js which will set globalThis.BadgeManager and globalThis.FieldTracker
await import('./content.js');

// Get the classes from globalThis
const BadgeManager = globalThis.BadgeManager;
const FieldTracker = globalThis.FieldTracker;

describe('BadgeManager', () => {
  let badgeManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    badgeManager = new BadgeManager();
  });

  afterEach(() => {
    badgeManager.cleanup();
  });

  describe('createBadge', () => {
    test('creates a badge element with correct text', () => {
      const badge = badgeManager.createBadge();

      expect(badge).toBeInstanceOf(HTMLElement);
      expect(badge.textContent).toBe('activated');
      expect(badge.className).toBe('chromegg-badge');
    });

    test('badge has correct ARIA attributes', () => {
      const badge = badgeManager.createBadge();

      expect(badge.getAttribute('role')).toBe('status');
      expect(badge.getAttribute('aria-live')).toBe('polite');
    });

    test('creates only one badge instance', () => {
      const badge1 = badgeManager.createBadge();
      const badge2 = badgeManager.createBadge();

      expect(badge1).toBe(badge2);
    });
  });

  describe('showBadge', () => {
    test('positions badge relative to target element', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      const badge = document.querySelector('.chromegg-badge');

      expect(badge).toBeTruthy();
      expect(badge.style.position).toBe('fixed');
      expect(badge.style.display).toBe('block');
    });

    test('appends badge to document body', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      const badge = document.querySelector('.chromegg-badge');

      expect(document.body.contains(badge)).toBe(true);
    });
  });

  describe('hideBadge', () => {
    test('hides the badge', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      const badge = document.querySelector('.chromegg-badge');
      expect(badge.style.display).toBe('block');

      badgeManager.hideBadge();
      expect(badge.style.display).toBe('none');
    });

    test('clears the current target', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      badgeManager.hideBadge();

      expect(badgeManager.currentTarget).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('removes badge from DOM', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      expect(document.querySelector('.chromegg-badge')).toBeTruthy();

      badgeManager.cleanup();
      expect(document.querySelector('.chromegg-badge')).toBeFalsy();
    });
  });
});

describe('FieldTracker', () => {
  let fieldTracker;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.chromeggtesting = true; // Prevent auto-init
  });

  afterEach(() => {
    if (fieldTracker) {
      fieldTracker.cleanup();
    }
    delete window.chromeggtesting;
  });

  describe('isTrackableField', () => {
    test('returns true for text input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'text';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns true for email input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'email';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns true for password input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'password';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns true for textarea', () => {
      fieldTracker = new FieldTracker();
      const textarea = document.createElement('textarea');

      expect(fieldTracker.isTrackableField(textarea)).toBe(true);
    });

    test('returns true for contenteditable element', () => {
      fieldTracker = new FieldTracker();
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');

      expect(fieldTracker.isTrackableField(div)).toBe(true);
    });

    test('returns true for search input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'search';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns true for tel input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'tel';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns true for url input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'url';

      expect(fieldTracker.isTrackableField(input)).toBe(true);
    });

    test('returns false for submit button', () => {
      fieldTracker = new FieldTracker();
      const button = document.createElement('input');
      button.type = 'submit';

      expect(fieldTracker.isTrackableField(button)).toBe(false);
    });

    test('returns false for checkbox', () => {
      fieldTracker = new FieldTracker();
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      expect(fieldTracker.isTrackableField(checkbox)).toBe(false);
    });

    test('returns false for regular div', () => {
      fieldTracker = new FieldTracker();
      const div = document.createElement('div');

      expect(fieldTracker.isTrackableField(div)).toBe(false);
    });

    test('returns false for null', () => {
      fieldTracker = new FieldTracker();
      expect(fieldTracker.isTrackableField(null)).toBe(false);
    });

    test('returns false for disabled input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'text';
      input.disabled = true;

      expect(fieldTracker.isTrackableField(input)).toBe(false);
    });

    test('returns false for readonly input', () => {
      fieldTracker = new FieldTracker();
      const input = document.createElement('input');
      input.type = 'text';
      input.readOnly = true;

      expect(fieldTracker.isTrackableField(input)).toBe(false);
    });
  });

  describe('handleFocus', () => {
    test('does nothing on focus (badge removed)', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      input.focus();

      // No badge should be shown on focus
      const badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeFalsy();
    });
  });

  describe('handleBlur', () => {
    test('does not trigger scan without scanner configured', () => {
      fieldTracker = new FieldTracker(); // No scanner
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test value';
      document.body.appendChild(input);

      input.focus();
      input.blur();

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe('handleChange', () => {
    test('does not scan when continuous mode is disabled', () => {
      let scanCalled = false;
      const mockScanner = {
        scanContent: () => {
          scanCalled = true;
          return Promise.resolve({ policy_breaks: [], policy_break_count: 0 });
        },
      };
      fieldTracker = new FieldTracker(mockScanner, { continuousMode: false });
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test value';
      document.body.appendChild(input);

      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Scanner should NOT be called
      expect(scanCalled).toBe(false);
    });

    test('scans when continuous mode is enabled', () => {
      let scanCalled = false;
      const mockScanner = {
        scanContent: () => {
          scanCalled = true;
          return Promise.resolve({ policy_breaks: [], policy_break_count: 0 });
        },
      };
      fieldTracker = new FieldTracker(mockScanner, { continuousMode: true });
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test value';
      document.body.appendChild(input);

      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Scanner SHOULD be called
      expect(scanCalled).toBe(true);
    });
  });

  describe('init', () => {
    test('sets up event listeners', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      expect(fieldTracker.focusHandler).toBeTruthy();
      expect(fieldTracker.changeHandler).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    test('removes event listeners', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      expect(fieldTracker.focusHandler).toBeTruthy();
      expect(fieldTracker.changeHandler).toBeTruthy();

      fieldTracker.cleanup();

      expect(fieldTracker.focusHandler).toBeNull();
      expect(fieldTracker.changeHandler).toBeNull();
      expect(fieldTracker.badgeManager.currentTarget).toBeNull();
    });
  });

  describe('collect FormData', () => {
    test('collects text from all trackable fields', () => {
      fieldTracker = new FieldTracker();

      const input1 = document.createElement('input');
      input1.type = 'text';
      input1.value = 'test value 1';
      input1.name = 'field1';
      document.body.appendChild(input1);

      const input2 = document.createElement('input');
      input2.type = 'email';
      input2.value = 'test@example.com';
      input2.id = 'email';
      document.body.appendChild(input2);

      const result = fieldTracker.collectFormData();

      expect(result).toBeTruthy();

      // Check YAML document format
      expect(result.document).toContain('- field_id: input_text_field1');
      expect(result.document).toContain('- field_id: input_email_email');
      expect(result.document).toContain('value: |');
      expect(result.document).toContain('test value 1');
      expect(result.document).toContain('test@example.com');
      expect(result.fieldMap.size).toBe(2);
      expect(result.fieldLineMap.size).toBe(2);
    });

    test('skips empty fields', () => {
      fieldTracker = new FieldTracker();

      const input1 = document.createElement('input');
      input1.type = 'text';
      input1.value = '   ';
      document.body.appendChild(input1);

      const input2 = document.createElement('input');
      input2.type = 'text';
      input2.value = 'has content';
      document.body.appendChild(input2);

      const result = fieldTracker.collectFormData();

      expect(result).toBeTruthy();
      expect(result.fieldMap.size).toBe(1);
    });

    test('returns null when no fields have content', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = '';
      document.body.appendChild(input);

      const result = fieldTracker.collectFormData();

      expect(result).toBeNull();
    });
  });

  describe('getFieldIdentifier', () => {
    test('uses field name if available', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.name = 'username';
      input.type = 'text';

      const id = fieldTracker.getFieldIdentifier(input, 0);

      expect(id).toBe('input_text_username');
    });

    test('uses field id if name not available', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.id = 'email-field';
      input.type = 'email';

      const id = fieldTracker.getFieldIdentifier(input, 0);

      expect(id).toBe('input_email_email-field');
    });

    test('uses field index if no name or id', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';

      const id = fieldTracker.getFieldIdentifier(input, 5);

      expect(id).toBe('input_text_field_5');
    });

    test('sanitizes special characters', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.name = 'user name!@#';
      input.type = 'text';

      const id = fieldTracker.getFieldIdentifier(input, 0);

      expect(id).toBe('input_text_user_name___');
    });
  });

  describe('findFieldIdForMatch', () => {
    test('finds field using line numbers', () => {
      fieldTracker = new FieldTracker();

      const fieldLineMap = new Map();
      fieldLineMap.set('field1', {
        startLine: 1,
        endLine: 3,
        valueStartLine: 3,
      });
      fieldLineMap.set('field2', {
        startLine: 4,
        endLine: 6,
        valueStartLine: 6,
      });

      const match = { match: 'secret123', line_start: 6, line_end: 6 };
      const result = fieldTracker.findFieldIdForMatch(match, fieldLineMap);

      expect(result).toBe('field2');
    });

    test('returns null when no field matches line range', () => {
      fieldTracker = new FieldTracker();

      const fieldLineMap = new Map();
      fieldLineMap.set('field1', {
        startLine: 1,
        endLine: 3,
        valueStartLine: 3,
      });

      const match = { match: 'secret123', line_start: 10, line_end: 10 };
      const result = fieldTracker.findFieldIdForMatch(match, fieldLineMap);

      expect(result).toBeNull();
    });

    test('returns null when match has no line_start', () => {
      fieldTracker = new FieldTracker();

      const fieldLineMap = new Map();
      fieldLineMap.set('field1', {
        startLine: 1,
        endLine: 3,
        valueStartLine: 3,
      });

      const match = { match: 'secret123' };
      const result = fieldTracker.findFieldIdForMatch(match, fieldLineMap);

      expect(result).toBeNull();
    });

    test('finds field using chunk field IDs by searching for match text', () => {
      fieldTracker = new FieldTracker();

      // Create DOM fields
      const field1 = document.createElement('input');
      field1.type = 'text';
      field1.value = 'Bearer token123';
      field1.setAttribute('data-gg-id', 'field-0');
      document.body.appendChild(field1);

      const field2 = document.createElement('input');
      field2.type = 'text';
      field2.value = 'no secrets here';
      field2.setAttribute('data-gg-id', 'field-1');
      document.body.appendChild(field2);

      const chunkFieldIds = ['field-0', 'field-1'];
      const match = { match: 'token123', line_start: 2, line_end: 2 };

      // Build field value cache for performance
      const fieldValueCache = new Map();
      fieldValueCache.set('field-0', 'Bearer token123');
      fieldValueCache.set('field-1', 'no secrets here');

      // When chunk field IDs are provided, should use text search instead of line numbers
      const result = fieldTracker.findFieldIdForMatch(
        match,
        new Map(),
        chunkFieldIds,
        fieldValueCache
      );

      expect(result).toBe('field-0');
    });

    test('returns null when match text not found in chunk fields', () => {
      fieldTracker = new FieldTracker();

      const field1 = document.createElement('input');
      field1.type = 'text';
      field1.value = 'some value';
      field1.setAttribute('data-gg-id', 'field-0');
      document.body.appendChild(field1);

      const chunkFieldIds = ['field-0'];
      const match = { match: 'nonexistent', line_start: 2, line_end: 2 };

      const fieldValueCache = new Map();
      fieldValueCache.set('field-0', 'some value');

      const result = fieldTracker.findFieldIdForMatch(
        match,
        new Map(),
        chunkFieldIds,
        fieldValueCache
      );

      expect(result).toBeNull();
    });
  });

  describe('updateFieldBorders', () => {
    test('does nothing when scanResult is null', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test';
      document.body.appendChild(input);

      fieldTracker.updateFieldBorders(null, new Map());

      expect(input.classList.contains('chromegg-secret-found')).toBe(false);
    });

    test('handles single document response format', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test';
      input.setAttribute('data-gg-id', 'test-field');
      document.body.appendChild(input);

      const scanResult = {
        policy_breaks: [],
        policy_break_count: 0,
      };

      const fieldMap = new Map();
      fieldMap.set('test-field', input);

      fieldTracker.updateFieldBorders(scanResult, fieldMap);

      // No secrets found - should not have any border styling
      expect(input.classList.contains('chromegg-secret-found')).toBe(false);
    });

    test('handles multi-document response format', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test';
      input.setAttribute('data-gg-id', 'test-field');
      document.body.appendChild(input);

      const scanResult = {
        scan_results: [
          {
            policy_breaks: [],
            policy_break_count: 0,
          },
        ],
      };

      const fieldMap = new Map();
      fieldMap.set('test-field', input);

      fieldTracker.updateFieldBorders(scanResult, fieldMap);

      // No secrets found - should not have any border styling
      expect(input.classList.contains('chromegg-secret-found')).toBe(false);
    });

    test('handles large number of fields with batched updates', (done) => {
      fieldTracker = new FieldTracker();

      const fieldMap = new Map();
      const fieldsWithSecrets = [];

      // Create 250 fields (more than BATCH_SIZE of 100)
      for (let i = 0; i < 250; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = i % 50 === 0 ? 'Bearer secret123' : 'normal value';
        input.setAttribute('data-gg-id', `field-${i}`);
        document.body.appendChild(input);
        fieldMap.set(`field-${i}`, input);

        if (i % 50 === 0) {
          fieldsWithSecrets.push(`field-${i}`);
        }
      }

      const policyBreaks = fieldsWithSecrets.map((fieldId) => ({
        type: 'Bearer Token',
        matches: [{ match: 'secret123', line_start: 1, line_end: 1 }],
        _chunkFieldIds: [fieldId],
      }));

      const scanResult = {
        policy_breaks: policyBreaks,
        policy_break_count: policyBreaks.length,
      };

      fieldTracker.updateFieldBorders(scanResult, fieldMap);

      // Wait for batched updates to complete
      setTimeout(() => {
        // Check that fields with secrets got red borders
        fieldsWithSecrets.forEach((fieldId) => {
          const field = document.querySelector(`[data-gg-id="${fieldId}"]`);
          expect(field.classList.contains('chromegg-secret-found')).toBe(true);
        });

        // Check that fields without secrets have no border styling
        const cleanField = document.querySelector('[data-gg-id="field-1"]');
        expect(cleanField.classList.contains('chromegg-secret-found')).toBe(
          false
        );

        done();
      }, 100);
    });
  });

  describe('applyRedaction', () => {
    test('does not redact when autoRedact is false', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: false,
        redactText: 'REDACTED',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'secret ghp_1234567890';
      document.body.appendChild(input);

      // GitGuardian returns plain text matches with YAML
      const matches = [{ match: 'ghp_1234567890', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(input, matches);

      expect(input.value).toBe('secret ghp_1234567890');
    });

    test('redacts secrets when autoRedact is true', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'REDACTED',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'secret ghp_1234567890 and more';
      document.body.appendChild(input);

      // GitGuardian returns plain text matches with YAML
      const matches = [{ match: 'ghp_1234567890', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(input, matches);

      // The space after the token is preserved
      expect(input.value).toBe('secret REDACTED and more');
    });

    test('uses custom redaction text', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: '[HIDDEN]',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'password: secret123';
      document.body.appendChild(input);

      const matches = [{ match: 'secret123', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(input, matches);

      expect(input.value).toBe('password: [HIDDEN]');
    });

    test('redacts multiple secrets', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'XXX',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'key1: secret1 key2: secret2';
      document.body.appendChild(input);

      const matches = [
        { match: 'secret1', line_start: 1, line_end: 1 },
        { match: 'secret2', line_start: 1, line_end: 1 },
      ];
      fieldTracker.applyRedaction(input, matches);

      expect(input.value).toBe('key1: XXX key2: XXX');
    });

    test('redacts in contenteditable elements', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'REDACTED',
      });

      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'secret token: abc123';
      document.body.appendChild(div);

      const matches = [{ match: 'abc123', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(div, matches);

      expect(div.textContent).toBe('secret token: REDACTED');
    });

    test('handles plain text matches correctly', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'REDACTED',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'this has token123 inside';
      document.body.appendChild(input);

      const matches = [{ match: 'token123', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(input, matches);

      expect(input.value).toBe('this has REDACTED inside');
    });

    test('does nothing with empty matches array', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'REDACTED',
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'no secrets here';
      document.body.appendChild(input);

      fieldTracker.applyRedaction(input, []);

      expect(input.value).toBe('no secrets here');
    });

    test('redacts all occurrences of the same secret', () => {
      fieldTracker = new FieldTracker(null, {
        autoRedact: true,
        redactText: 'REDACTED',
      });

      const textarea = document.createElement('textarea');
      textarea.value =
        'Bearer token123\nAnother line with token123\ntoken123 appears three times';
      document.body.appendChild(textarea);

      // GitGuardian might only return one match even if secret appears multiple times
      const matches = [{ match: 'token123', line_start: 1, line_end: 1 }];
      fieldTracker.applyRedaction(textarea, matches);

      expect(textarea.value).toBe(
        'Bearer REDACTED\nAnother line with REDACTED\nREDACTED appears three times'
      );
    });
  });
});
