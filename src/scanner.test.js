import { GitGuardianScanner } from './scanner.js';

describe('GitGuardianScanner', () => {
  let scanner;
  const apiUrl = 'https://api.gitguardian.com';
  const apiKey = 'test-api-key';
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    scanner = new GitGuardianScanner(apiUrl, apiKey);

    // Mock chrome API
    global.chrome = {
      runtime: {
        sendMessage: null, // Will be set in individual tests
        lastError: null,
      },
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete global.chrome;
  });

  describe('constructor', () => {
    test('initializes with API URL and key', () => {
      expect(scanner.apiUrl).toBe(apiUrl);
      expect(scanner.apiKey).toBe(apiKey);
    });
  });

  describe('scanContent', () => {
    test('throws error if API URL is missing', async () => {
      const invalidScanner = new GitGuardianScanner('', apiKey);
      await expect(
        invalidScanner.scanContent([{ document: 'test', filename: 'test.txt' }])
      ).rejects.toThrow('GitGuardian API URL and key are required');
    });

    test('throws error if API key is missing', async () => {
      const invalidScanner = new GitGuardianScanner(apiUrl, '');
      await expect(
        invalidScanner.scanContent([{ document: 'test', filename: 'test.txt' }])
      ).rejects.toThrow('GitGuardian API URL and key are required');
    });

    test('sends message to background script via chrome.runtime', async () => {
      const mockResponse = {
        policy_breaks: [],
        policy_break_count: 0,
      };

      let capturedMessage;
      global.chrome.runtime.sendMessage = (message, callback) => {
        capturedMessage = message;
        callback({ success: true, data: mockResponse });
      };

      const documentData = { document: 'test content', filename: 'test.txt' };
      const result = await scanner.scanContent(documentData);

      expect(capturedMessage.action).toBe('scanContent');
      expect(capturedMessage.data.apiUrl).toBe(apiUrl);
      expect(capturedMessage.data.apiKey).toBe(apiKey);
      expect(result).toEqual(mockResponse);
    });

    test('handles chrome runtime error', async () => {
      global.chrome.runtime.lastError = {
        message: 'Extension context invalidated',
      };
      global.chrome.runtime.sendMessage = (message, callback) => {
        callback({});
      };

      const documentData = { document: 'test', filename: 'test.txt' };

      await expect(scanner.scanContent(documentData)).rejects.toThrow(
        'Extension context invalidated'
      );

      global.chrome.runtime.lastError = null;
    });

    test('handles API error from background script', async () => {
      global.chrome.runtime.sendMessage = (message, callback) => {
        callback({ success: false, error: 'API key invalid' });
      };

      const documentData = { document: 'test', filename: 'test.txt' };

      await expect(scanner.scanContent(documentData)).rejects.toThrow(
        'API key invalid'
      );
    });
  });

  describe('hasSecrets', () => {
    test('returns true when secrets are found', () => {
      const scanResult = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 1,
            policy_breaks: [{ type: 'AWS Key' }],
          },
        ],
      };

      expect(scanner.hasSecrets(scanResult)).toBe(true);
    });

    test('returns false when no secrets are found', () => {
      const scanResult = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 0,
            policy_breaks: [],
          },
        ],
      };

      expect(scanner.hasSecrets(scanResult)).toBe(false);
    });

    test('returns false for null result', () => {
      expect(scanner.hasSecrets(null)).toBe(false);
    });

    test('returns false for result without scan_results', () => {
      expect(scanner.hasSecrets({})).toBe(false);
    });
  });

  describe('getSecretsForDocument', () => {
    test('returns policy breaks for specific document', () => {
      const policyBreaks = [{ type: 'AWS Key', break_type: 'secret' }];
      const scanResult = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 1,
            policy_breaks: policyBreaks,
          },
          {
            filename: 'other.txt',
            policies_break_count: 0,
            policy_breaks: [],
          },
        ],
      };

      expect(scanner.getSecretsForDocument(scanResult, 'test.txt')).toEqual(
        policyBreaks
      );
    });

    test('returns empty array for document with no secrets', () => {
      const scanResult = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 0,
            policy_breaks: [],
          },
        ],
      };

      expect(scanner.getSecretsForDocument(scanResult, 'test.txt')).toEqual([]);
    });

    test('returns empty array for non-existent document', () => {
      const scanResult = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 0,
            policy_breaks: [],
          },
        ],
      };

      expect(scanner.getSecretsForDocument(scanResult, 'missing.txt')).toEqual(
        []
      );
    });

    test('returns empty array for null result', () => {
      expect(scanner.getSecretsForDocument(null, 'test.txt')).toEqual([]);
    });

    test('returns empty array for result without scan_results', () => {
      expect(scanner.getSecretsForDocument({}, 'test.txt')).toEqual([]);
    });
  });
});
