import { FieldTracker } from './content.js';

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
    test('shows badge when trackable field is focused', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      input.focus();

      const badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeTruthy();
      expect(badge.style.display).toBe('block');
    });

    test('does not show badge for non-trackable field', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      const button = document.createElement('button');
      document.body.appendChild(button);

      button.focus();

      const badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeFalsy();
    });
  });

  describe('handleBlur', () => {
    test('hides badge when field loses focus', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      input.focus();

      let badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeTruthy();
      expect(badge.style.display).toBe('block');

      input.blur();

      badge = document.querySelector('.chromegg-badge');
      expect(badge.style.display).toBe('none');
    });
  });

  describe('init', () => {
    test('sets up event listeners', () => {
      fieldTracker = new FieldTracker();
      fieldTracker.init();

      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      input.focus();

      const badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    test('hides badge and removes event listeners', () => {
      fieldTracker = new FieldTracker();

      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      fieldTracker.init();
      input.focus();

      const badge = document.querySelector('.chromegg-badge');
      expect(badge).toBeTruthy();
      expect(badge.style.display).toBe('block');

      // Get the badge reference before cleanup
      const badgeElement = fieldTracker.badgeManager.badge;

      fieldTracker.cleanup();

      // Badge should be hidden after cleanup (check the badge manager's badge reference)
      if (badgeElement && badgeElement.parentElement) {
        // Badge might still be in DOM but should be hidden
        expect(badgeElement.style.display).toBe('none');
      }
      expect(fieldTracker.badgeManager.currentTarget).toBeNull();
    });
  });
});
