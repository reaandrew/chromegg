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

    test('badge is visible after showBadge', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      const badge = document.querySelector('.chromegg-badge');

      expect(badge.style.display).toBe('block');
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

    test('clears current target', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      badgeManager.cleanup();

      expect(badgeManager.currentTarget).toBeNull();
    });
  });

  describe('updateBadgePosition', () => {
    test('updates position based on target element', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      badgeManager.showBadge(input);
      badgeManager.updateBadgePosition();

      const badge = document.querySelector('.chromegg-badge');
      expect(badge.style.position).toBe('fixed');
      expect(badge.style.top).toBeTruthy();
      expect(badge.style.left).toBeTruthy();
    });

    test('does nothing when no target is set', () => {
      badgeManager.updateBadgePosition();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
