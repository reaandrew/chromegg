export class BadgeManager {
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
