import { BadgeManager } from './badge.js';

describe('BadgeManager', () => {
  let badgeManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    badgeManager = new BadgeManager();
  });

  afterEach(() => {
    badgeManager.cleanup();
  });

  describe('constructor', () => {
    test('initializes with null values', () => {
      expect(badgeManager.badge).toBeNull();
      expect(badgeManager.currentTarget).toBeNull();
      expect(badgeManager.scrollHandler).toBeNull();
      expect(badgeManager.resizeHandler).toBeNull();
    });
  });

  describe('createBadge', () => {
    test('creates a badge element with correct properties', () => {
      const badge = badgeManager.createBadge();

      expect(badge).toBeInstanceOf(HTMLElement);
      expect(badge.textContent).toBe('activated');
      expect(badge.className).toBe('chromegg-badge');
      expect(badge.getAttribute('role')).toBe('status');
      expect(badge.getAttribute('aria-live')).toBe('polite');
    });

    test('returns existing badge on subsequent calls', () => {
      const badge1 = badgeManager.createBadge();
      const badge2 = badgeManager.createBadge();

      expect(badge1).toBe(badge2);
    });

    test('stores badge reference', () => {
      badgeManager.createBadge();
      expect(badgeManager.badge).not.toBeNull();
    });
  });

  describe('showBadge', () => {
    test('does nothing when targetElement is null', () => {
      badgeManager.showBadge(null);
      expect(badgeManager.badge).toBeNull();
      expect(badgeManager.currentTarget).toBeNull();
    });

    test('creates badge if it does not exist', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(badgeManager.badge).not.toBeNull();
    });

    test('appends badge to document body', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(document.body.contains(badgeManager.badge)).toBe(true);
    });

    test('sets currentTarget', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(badgeManager.currentTarget).toBe(input);
    });

    test('makes badge visible', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(badgeManager.badge.style.display).toBe('block');
    });

    test('positions badge with fixed positioning', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(badgeManager.badge.style.position).toBe('fixed');
      expect(badgeManager.badge.style.zIndex).toBe('2147483647');
    });

    test('adds scroll and resize event listeners', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      expect(badgeManager.scrollHandler).not.toBeNull();
      expect(badgeManager.resizeHandler).not.toBeNull();
    });

    test('reuses existing badge if already created', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      const firstBadge = badgeManager.badge;

      badgeManager.hideBadge();
      badgeManager.showBadge(input);

      expect(badgeManager.badge).toBe(firstBadge);
    });
  });

  describe('updateBadgePosition', () => {
    test('does nothing when currentTarget is null', () => {
      badgeManager.createBadge();
      badgeManager.currentTarget = null;

      badgeManager.updateBadgePosition();

      expect(badgeManager.badge.style.top).toBe('');
    });

    test('does nothing when badge is null', () => {
      const input = document.createElement('input');
      badgeManager.currentTarget = input;
      badgeManager.badge = null;

      badgeManager.updateBadgePosition();

      expect(true).toBe(true); // Should not throw
    });

    test('updates badge position based on target element', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      const rect = input.getBoundingClientRect();

      expect(badgeManager.badge.style.top).toBe(`${rect.top - 25}px`);
      expect(badgeManager.badge.style.left).toBe(`${rect.left}px`);
    });
  });

  describe('hideBadge', () => {
    test('hides badge by setting display to none', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      expect(badgeManager.badge.style.display).toBe('block');

      badgeManager.hideBadge();
      expect(badgeManager.badge.style.display).toBe('none');
    });

    test('clears currentTarget', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      expect(badgeManager.currentTarget).toBe(input);

      badgeManager.hideBadge();
      expect(badgeManager.currentTarget).toBeNull();
    });

    test('removes scroll event listener', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      badgeManager.hideBadge();

      expect(badgeManager.scrollHandler).toBeNull();
    });

    test('removes resize event listener', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);

      badgeManager.hideBadge();

      expect(badgeManager.resizeHandler).toBeNull();
    });

    test('does nothing when badge is null', () => {
      badgeManager.badge = null;
      badgeManager.hideBadge(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('removes badge from DOM', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      expect(document.body.contains(badgeManager.badge)).toBe(true);

      badgeManager.cleanup();
      expect(document.querySelector('.chromegg-badge')).toBeNull();
    });

    test('sets badge to null', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      badgeManager.cleanup();

      expect(badgeManager.badge).toBeNull();
    });

    test('calls hideBadge', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      badgeManager.cleanup();

      expect(badgeManager.currentTarget).toBeNull();
      expect(badgeManager.scrollHandler).toBeNull();
      expect(badgeManager.resizeHandler).toBeNull();
    });

    test('does nothing when badge is not in DOM', () => {
      badgeManager.createBadge();
      // Don't append to body
      badgeManager.cleanup(); // Should not throw
      expect(badgeManager.badge).toBeNull();
    });

    test('does nothing when badge is null', () => {
      badgeManager.badge = null;
      badgeManager.cleanup(); // Should not throw
      expect(true).toBe(true);
    });
  });
});
