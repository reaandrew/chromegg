/**
 * Debug Logger
 * Provides conditional logging based on debug mode setting
 */

class Logger {
  constructor() {
    this.debugMode = false;
    this.loadDebugSetting();
  }

  /**
   * Load debug mode setting from storage
   */
  loadDebugSetting() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['debugMode'], (result) => {
        this.debugMode = result.debugMode || false;
      });

      // Listen for changes to debug mode
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.debugMode) {
          this.debugMode = changes.debugMode.newValue || false;
        }
      });
    }
  }

  /**
   * Log a debug message (only if debug mode is enabled)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.debugMode) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Log a warning message (only if debug mode is enabled)
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.debugMode) {
      console.warn('[DEBUG]', ...args);
    }
  }

  /**
   * Log an error message (always logged, regardless of debug mode)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    console.error('[ERROR]', ...args);
  }
}

// Create singleton instance
const logger = new Logger();

// Export for ES modules
export { logger };
