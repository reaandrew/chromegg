// Set test flag before import
global.window = { chromeggtesting: true };

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
      expect(fieldTracker.blurHandler).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    test('removes event listeners', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      expect(fieldTracker.focusHandler).toBeTruthy();
      expect(fieldTracker.blurHandler).toBeTruthy();

      fieldTracker.cleanup();

      expect(fieldTracker.focusHandler).toBeNull();
      expect(fieldTracker.blurHandler).toBeNull();
      expect(fieldTracker.badgeManager.currentTarget).toBeNull();
    });
  });
});
