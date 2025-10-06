import { GitGuardianScanner } from './scanner.js';
import { logger } from './logger.js';
import { chunkYaml } from './chunker.js';

// Make logger and chunkYaml globally available for tests
global.logger = logger;
global.chunkYaml = chunkYaml;

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
        invalidScanner.scanContent({ document: 'test', filename: 'test.txt' })
      ).rejects.toThrow('GitGuardian API URL and key are required');
    });

    test('throws error if API key is missing', async () => {
      const invalidScanner = new GitGuardianScanner(apiUrl, '');
      await expect(
        invalidScanner.scanContent({ document: 'test', filename: 'test.txt' })
      ).rejects.toThrow('GitGuardian API URL and key are required');
    });

    test('uses multiscan for chunked content', async () => {
      // Create large YAML that will be chunked
      const largeYaml = Array(2000)
        .fill(0)
        .map(
          (_, i) =>
            `- field_id: field${i}\n  value: |\n    ${'x'.repeat(1000)}\n`
        )
        .join('');

      const mockResponse = [
        { policy_breaks: [], policy_break_count: 0 },
        { policy_breaks: [], policy_break_count: 0 },
      ];

      global.chrome.runtime.sendMessage = (message, callback) => {
        callback({ success: true, data: mockResponse });
      };

      const documentData = { document: largeYaml, filename: 'large.yaml' };
      const result = await scanner.scanContent(documentData);

      expect(result.policy_breaks).toBeDefined();
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

  describe('combineScanResults', () => {
    test('combines results from multiscan array response', () => {
      const chunks = [
        { document: 'chunk1', filename: 'chunk1.yaml', fieldIds: ['field1'] },
        { document: 'chunk2', filename: 'chunk2.yaml', fieldIds: ['field2'] },
      ];

      const batchResults = [
        [
          {
            policy_break_count: 1,
            policies: ['Secrets detection'],
            policy_breaks: [
              { type: 'AWS Key', matches: [{ match: 'secret1' }] },
            ],
          },
          {
            policy_break_count: 1,
            policies: ['Secrets detection'],
            policy_breaks: [
              { type: 'GitHub Token', matches: [{ match: 'secret2' }] },
            ],
          },
        ],
      ];
      batchResults[0].chunks = chunks;

      const result = scanner.combineScanResults(batchResults, chunks);

      expect(result.policy_break_count).toBe(2);
      expect(result.policy_breaks.length).toBe(2);
      expect(result.policy_breaks[0]._chunkFieldIds).toEqual(['field1']);
      expect(result.policy_breaks[1]._chunkFieldIds).toEqual(['field2']);
    });

    test('handles scan_results wrapped format', () => {
      const chunks = [
        { document: 'chunk1', filename: 'chunk1.yaml', fieldIds: ['field1'] },
      ];

      const batchResults = [
        {
          scan_results: [
            {
              policy_break_count: 1,
              policies: ['Secrets detection'],
              policy_breaks: [
                { type: 'AWS Key', matches: [{ match: 'secret1' }] },
              ],
            },
          ],
        },
      ];
      batchResults[0].chunks = chunks;

      const result = scanner.combineScanResults(batchResults, chunks);

      expect(result.policy_break_count).toBe(1);
      expect(result.policy_breaks.length).toBe(1);
    });

    test('handles single scan response format', () => {
      const chunks = [
        { document: 'chunk1', filename: 'chunk1.yaml', fieldIds: ['field1'] },
      ];

      const batchResults = [
        {
          policy_break_count: 1,
          policies: ['Secrets detection'],
          policy_breaks: [{ type: 'AWS Key', matches: [{ match: 'secret1' }] }],
        },
      ];
      batchResults[0].chunks = chunks;

      const result = scanner.combineScanResults(batchResults, chunks);

      expect(result.policy_break_count).toBe(1);
      expect(result.policy_breaks.length).toBe(1);
    });

    test('handles results without policy breaks', () => {
      const chunks = [
        { document: 'chunk1', filename: 'chunk1.yaml', fieldIds: ['field1'] },
      ];

      const batchResults = [
        [
          {
            policy_break_count: 0,
            policies: [],
          },
        ],
      ];
      batchResults[0].chunks = chunks;

      const result = scanner.combineScanResults(batchResults, chunks);

      expect(result.policy_break_count).toBe(0);
      expect(result.policy_breaks.length).toBe(0);
    });

    test('handles empty results', () => {
      const chunks = [];
      const batchResults = [];

      const result = scanner.combineScanResults(batchResults, chunks);

      expect(result.policy_break_count).toBe(0);
      expect(result.policy_breaks).toEqual([]);
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
