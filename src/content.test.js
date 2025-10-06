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

      // Parse the JSON document
      const parsed = JSON.parse(result.document);
      expect(parsed.fields).toHaveLength(2);

      // Check base64 encoded values
      const field1 = parsed.fields.find((f) => f.id === 'input_text_field1');
      const field2 = parsed.fields.find((f) => f.id === 'input_email_email');

      expect(field1).toBeTruthy();
      expect(field2).toBeTruthy();

      // Decode and verify values
      const decodedValue1 = decodeURIComponent(escape(atob(field1.value)));
      const decodedValue2 = decodeURIComponent(escape(atob(field2.value)));

      expect(decodedValue1).toBe('test value 1');
      expect(decodedValue2).toBe('test@example.com');
      expect(result.fieldMap.size).toBe(2);
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
    test('finds field containing match content', () => {
      fieldTracker = new FieldTracker();

      const input1 = document.createElement('input');
      input1.value = 'no match here';
      const input2 = document.createElement('input');
      input2.value = 'secret123';

      const fieldMap = new Map();
      fieldMap.set('field1', input1);
      fieldMap.set('field2', input2);

      const match = { match: 'secret123' };
      const result = fieldTracker.findFieldIdForMatch(match, fieldMap);

      expect(result).toBe('field2');
    });

    test('returns null when no field matches', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.value = 'no match';

      const fieldMap = new Map();
      fieldMap.set('field1', input);

      const match = { match: 'secret123' };
      const result = fieldTracker.findFieldIdForMatch(match, fieldMap);

      expect(result).toBeNull();
    });

    test('handles contenteditable fields', () => {
      fieldTracker = new FieldTracker();

      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = 'secret content';

      const fieldMap = new Map();
      fieldMap.set('field1', div);

      const match = { match: 'secret content' };
      const result = fieldTracker.findFieldIdForMatch(match, fieldMap);

      expect(result).toBe('field1');
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
      expect(input.classList.contains('chromegg-no-secret')).toBe(false);
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

      expect(input.classList.contains('chromegg-no-secret')).toBe(true);
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

      expect(input.classList.contains('chromegg-no-secret')).toBe(true);
    });
  });
});
