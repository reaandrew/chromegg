/**
 * GitGuardian API Scanner
 * Handles communication with GitGuardian API for secret scanning
 */

class GitGuardianScanner {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Scan content for secrets using GitGuardian API
   * Uses Chrome messaging to avoid CORS issues
   * @param {Object} documentData - Single document object with document, filename, and fieldMap
   * @returns {Promise<Object>} Scan results from GitGuardian
   */
  async scanContent(documentData) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('GitGuardian API URL and key are required');
    }

    // Logging disabled for production - use for debugging:
    // console.warn('Scanner.scanContent received:', documentData);

    // Prepare single document for GitGuardian API
    const documents = [
      {
        document: documentData.document,
        filename: documentData.filename,
      },
    ];

    // Logging disabled for production - use for debugging:
    // console.warn('Scanner.scanContent prepared documents:', documents);

    const messageData = {
      action: 'scanContent',
      data: {
        apiUrl: this.apiUrl,
        apiKey: this.apiKey,
        documents: documents,
      },
    };

    // Logging disabled for production - use for debugging:
    // console.warn('Sending message to background:', JSON.stringify(messageData, null, 2));

    // Send request to background script to avoid CORS
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(messageData, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  }

  /**
   * Check if scan result contains any secrets
   * @param {Object} scanResult - Result from GitGuardian API
   * @returns {boolean} True if secrets were found
   */
  hasSecrets(scanResult) {
    if (!scanResult || !scanResult.scan_results) {
      return false;
    }

    return scanResult.scan_results.some(
      (result) => result.policies_break_count > 0
    );
  }

  /**
   * Get secrets found in a specific document
   * @param {Object} scanResult - Result from GitGuardian API
   * @param {string} filename - Document filename to check
   * @returns {Array} Array of policy breaks for the document
   */
  getSecretsForDocument(scanResult, filename) {
    if (!scanResult || !scanResult.scan_results) {
      return [];
    }

    const documentResult = scanResult.scan_results.find(
      (result) => result.filename === filename
    );

    return documentResult && documentResult.policy_breaks
      ? documentResult.policy_breaks
      : [];
  }
}

// Export for tests (ES modules)
export { GitGuardianScanner };
