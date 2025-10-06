/**
 * GitGuardian API Scanner
 * Handles communication with GitGuardian API for secret scanning
 */

// Logger and chunker are available globally
/* global logger, chunkYaml */

class GitGuardianScanner {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Scan content for secrets using GitGuardian API
   * Automatically chunks large content and uses multiscan for efficiency
   * Uses Chrome messaging to avoid CORS issues
   * @param {Object} documentData - Single document object with document, filename, fieldMap, and fieldLineMap
   * @returns {Promise<Object>} Scan results from GitGuardian (normalized to single-document format)
   */
  async scanContent(documentData) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('GitGuardian API URL and key are required');
    }

    logger.warn('Scanner.scanContent received:', documentData);

    // Chunk the YAML content if needed
    const chunks = chunkYaml(
      documentData.document,
      documentData.filename.replace('.yaml', '')
    );

    logger.warn(`Content split into ${chunks.length} chunk(s)`);

    // If single chunk, use regular scan endpoint
    if (chunks.length === 1) {
      return this.scanSingle(chunks[0]);
    }

    // Multiple chunks - use multiscan
    return this.scanMultiple(chunks, documentData);
  }

  /**
   * Scan a single document using /v1/scan endpoint
   * @param {Object} chunk - Document chunk
   * @returns {Promise<Object>} Scan result
   */
  async scanSingle(chunk) {
    const messageData = {
      action: 'scanContent',
      data: {
        apiUrl: this.apiUrl,
        apiKey: this.apiKey,
        documents: [
          {
            document: chunk.document,
            filename: chunk.filename,
          },
        ],
        useMultiscan: false,
      },
    };

    logger.warn('Sending single scan request to background');

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(messageData, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success) {
          // Attach fieldIds to the result for easier processing
          response.data.fieldIds = chunk.fieldIds;
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  }

  /**
   * Scan multiple documents using /v1/multiscan endpoint
   * @param {Array<Object>} chunks - Array of document chunks
   * @param {Object} originalData - Original document data with fieldMap and fieldLineMap
   * @returns {Promise<Object>} Combined scan results
   */
  async scanMultiple(chunks, _originalData) {
    // Split chunks into batches of 20 (GitGuardian's limit)
    const MAX_DOCS_PER_SCAN = 20;
    const batches = [];
    const batchChunks = []; // Keep track of which chunks are in which batch

    for (let i = 0; i < chunks.length; i += MAX_DOCS_PER_SCAN) {
      const batch = chunks.slice(i, i + MAX_DOCS_PER_SCAN);
      batches.push(batch);
      batchChunks.push(batch);
    }

    logger.warn(`Scanning ${batches.length} batch(es) of chunks`);

    // Scan each batch
    const batchResults = [];
    for (let i = 0; i < batches.length; i++) {
      const result = await this.scanBatch(batches[i]);
      // Attach chunk info to result for mapping
      result.chunks = batchChunks[i];
      batchResults.push(result);
    }

    // Combine all batch results
    return this.combineScanResults(batchResults, chunks);
  }

  /**
   * Scan a batch of documents
   * @param {Array<Object>} batch - Batch of chunks to scan
   * @returns {Promise<Object>} Batch scan result
   */
  async scanBatch(batch) {
    const messageData = {
      action: 'scanContent',
      data: {
        apiUrl: this.apiUrl,
        apiKey: this.apiKey,
        documents: batch.map((chunk) => ({
          document: chunk.document,
          filename: chunk.filename,
          fieldIds: chunk.fieldIds,
        })),
        useMultiscan: true,
      },
    };

    logger.warn(`Sending multiscan request with ${batch.length} documents`);

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
   * Combine multiple scan results into a single result
   * @param {Array<Object>} batchResults - Array of batch scan results with chunk info
   * @param {Array<Object>} chunks - Original chunks with fieldIds
   * @returns {Object} Combined scan result
   */
  combineScanResults(batchResults, chunks) {
    const combined = {
      policy_break_count: 0,
      policies: [],
      policy_breaks: [],
      fieldIds: chunks.flatMap((c) => c.fieldIds),
      chunkMap: new Map(), // Map to track which chunk each policy break came from
    };

    logger.warn(`Combining ${batchResults.length} batch results`);

    // Merge results from all batches
    for (const batchResult of batchResults) {
      // batchResult is the GitGuardian response with .chunks property attached
      const resultChunks = batchResult.chunks || [];

      logger.warn(
        `Batch result type: ${Array.isArray(batchResult) ? 'array' : 'object'}, has chunks: ${!!batchResult.chunks}`
      );

      // GitGuardian multiscan returns an ARRAY: [{policy_breaks: [...], ...}, ...]
      // We attach .chunks property to track which chunk each result came from
      let scanResults;
      if (Array.isArray(batchResult)) {
        // Multiscan response is an array
        scanResults = batchResult;
        logger.warn(`Processing ${scanResults.length} scan results from array`);
      } else if (batchResult.scan_results) {
        // Wrapped format
        scanResults = batchResult.scan_results;
        logger.warn(
          `Processing ${scanResults.length} scan results from .scan_results`
        );
      } else {
        // Single scan response
        scanResults = [batchResult];
        logger.warn('Processing single scan result');
      }

      for (let i = 0; i < scanResults.length; i++) {
        const scanResult = scanResults[i];
        const chunk = resultChunks[i]; // Match result to chunk by index

        combined.policy_break_count += scanResult.policy_break_count || 0;

        if (scanResult.policy_breaks) {
          // Tag each policy break with its chunk's fieldIds
          logger.warn(
            `Chunk ${i} has ${scanResult.policy_breaks.length} policy breaks, ${chunk ? chunk.fieldIds.length : 0} fieldIds`
          );
          for (const policyBreak of scanResult.policy_breaks) {
            const taggedBreak = {
              ...policyBreak,
              _chunkFieldIds: chunk ? chunk.fieldIds : [],
            };
            combined.policy_breaks.push(taggedBreak);
          }
        }

        if (scanResult.policies) {
          for (const policy of scanResult.policies) {
            if (!combined.policies.includes(policy)) {
              combined.policies.push(policy);
            }
          }
        }
      }
    }

    logger.warn(
      `Combined ${combined.policy_breaks.length} total policy breaks from all batches`
    );
    return combined;
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
