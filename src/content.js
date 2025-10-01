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
  constructor() {
    this.badgeManager = new BadgeManager();
    this.focusHandler = null;
    this.blurHandler = null;
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

  handleFocus(event) {
    const target = event.target;

    if (this.isTrackableField(target)) {
      this.badgeManager.showBadge(target);
    }
  }

  handleBlur() {
    this.badgeManager.hideBadge();
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
if (typeof window !== 'undefined' && !window.chromeggtesting) {
  const tracker = new FieldTracker();
  tracker.init();
}
