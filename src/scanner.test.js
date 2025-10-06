import { GitGuardianScanner } from './scanner.js';

describe('GitGuardianScanner', () => {
  let scanner;
  const apiUrl = 'https://api.gitguardian.com';
  const apiKey = 'test-api-key';
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    scanner = new GitGuardianScanner(apiUrl, apiKey);
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

    test('makes POST request to GitGuardian API', async () => {
      const mockResponse = {
        scan_results: [
          {
            filename: 'test.txt',
            policies_break_count: 0,
            policy_breaks: [],
          },
        ],
      };

      let capturedUrl;
      let capturedOptions;

      global.fetch = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          ok: true,
          json: async () => mockResponse,
        };
      };

      const documents = [{ document: 'test content', filename: 'test.txt' }];
      const result = await scanner.scanContent(documents);

      expect(capturedUrl).toBe(`${apiUrl}/v1/scan`);
      expect(capturedOptions.method).toBe('POST');
      expect(capturedOptions.headers['Content-Type']).toBe('application/json');
      expect(capturedOptions.headers.Authorization).toBe(`Token ${apiKey}`);
      expect(result).toEqual(mockResponse);
    });

    test('handles API error response', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      const documents = [{ document: 'test', filename: 'test.txt' }];

      await expect(scanner.scanContent(documents)).rejects.toThrow(
        'GitGuardian API error: 401 Unauthorized - Invalid API key'
      );
    });

    test('handles network error', async () => {
      global.fetch = async () => {
        throw new Error('Network error');
      };

      const documents = [{ document: 'test', filename: 'test.txt' }];

      await expect(scanner.scanContent(documents)).rejects.toThrow(
        'Network error'
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
