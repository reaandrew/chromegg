import { logger } from './logger.js';

describe('Logger', () => {
  let mockChrome;
  let originalLog;
  let originalWarn;
  let originalError;
  let logCalls;
  let warnCalls;
  let errorCalls;

  beforeEach(() => {
    // Save original console methods
    originalLog = console.log;
    originalWarn = console.warn;
    originalError = console.error;

    // Track calls
    logCalls = [];
    warnCalls = [];
    errorCalls = [];

    // Mock console methods
    console.log = (...args) => logCalls.push(args);
    console.warn = (...args) => warnCalls.push(args);
    console.error = (...args) => errorCalls.push(args);

    // Mock chrome.storage
    mockChrome = {
      storage: {
        sync: {
          get: (keys, callback) => {
            callback({ debugMode: false });
          },
        },
        onChanged: {
          addListener: () => {},
        },
      },
    };
    global.chrome = mockChrome;

    // Reset logger debug mode
    logger.debugMode = false;
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    delete global.chrome;
  });

  describe('debug', () => {
    test('does not log when debug mode is disabled', () => {
      logger.debugMode = false;
      logger.debug('test message');

      expect(logCalls).toHaveLength(0);
    });

    test('logs when debug mode is enabled', () => {
      logger.debugMode = true;
      logger.debug('test message', { foo: 'bar' });

      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]).toEqual(['[DEBUG]', 'test message', { foo: 'bar' }]);
    });
  });

  describe('warn', () => {
    test('does not log when debug mode is disabled', () => {
      logger.debugMode = false;
      logger.warn('warning message');

      expect(warnCalls).toHaveLength(0);
    });

    test('logs when debug mode is enabled', () => {
      logger.debugMode = true;
      logger.warn('warning message', { foo: 'bar' });

      expect(warnCalls).toHaveLength(1);
      expect(warnCalls[0]).toEqual([
        '[DEBUG]',
        'warning message',
        { foo: 'bar' },
      ]);
    });
  });

  describe('error', () => {
    test('always logs errors regardless of debug mode', () => {
      logger.debugMode = false;
      logger.error('error message', { code: 500 });

      expect(errorCalls).toHaveLength(1);
      expect(errorCalls[0]).toEqual([
        '[ERROR]',
        'error message',
        { code: 500 },
      ]);
    });

    test('logs errors when debug mode is enabled', () => {
      logger.debugMode = true;
      logger.error('error message');

      expect(errorCalls).toHaveLength(1);
      expect(errorCalls[0]).toEqual(['[ERROR]', 'error message']);
    });
  });

  describe('loadDebugSetting', () => {
    test('loads debug mode from chrome storage', () => {
      let getCalled = false;
      mockChrome.storage.sync.get = (keys, callback) => {
        getCalled = true;
        callback({ debugMode: true });
      };

      logger.loadDebugSetting();

      expect(getCalled).toBe(true);
      expect(logger.debugMode).toBe(true);
    });

    test('sets up change listener for debug mode', () => {
      let listenerAdded = false;
      global.chrome = {
        storage: {
          sync: {
            get: (keys, callback) => callback({ debugMode: false }),
          },
          onChanged: {
            addListener: () => {
              listenerAdded = true;
            },
          },
        },
      };

      logger.loadDebugSetting();

      expect(listenerAdded).toBe(true);
    });

    test('updates debug mode when storage changes', () => {
      let changeListener;
      global.chrome = {
        storage: {
          sync: {
            get: (keys, callback) => callback({ debugMode: false }),
          },
          onChanged: {
            addListener: (listener) => {
              changeListener = listener;
            },
          },
        },
      };

      logger.loadDebugSetting();
      logger.debugMode = false;

      // Simulate storage change
      changeListener({ debugMode: { newValue: true } }, 'sync');

      expect(logger.debugMode).toBe(true);
    });

    test('handles missing debugMode in storage', () => {
      mockChrome.storage.sync.get = (keys, callback) => {
        callback({});
      };

      logger.loadDebugSetting();

      expect(logger.debugMode).toBe(false);
    });

    test('does nothing when chrome.storage is not available', () => {
      delete global.chrome;

      expect(() => logger.loadDebugSetting()).not.toThrow();
    });
  });
});
