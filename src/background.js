/**
 * Background Service Worker for Chromegg Extension
 * Handles GitGuardian API requests to avoid CORS issues
 */

// Logger is available globally from logger.js
/* global logger */

// Import logger module to initialize it
import './logger.js';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanContent') {
    // Handle async scan request
    handleScanRequest(request.data)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

/**
 * Handle GitGuardian scan request
 * @param {Object} data - Request data containing apiUrl, apiKey, documents, and useMultiscan flag
 * @returns {Promise<Object>} Scan results
 */
export async function handleScanRequest(data) {
  const { apiUrl, apiKey, documents, useMultiscan = false } = data;

  if (!apiUrl || !apiKey) {
    throw new Error('GitGuardian API URL and key are required');
  }

  // Choose endpoint based on useMultiscan flag
  const endpointPath = useMultiscan ? '/v1/multiscan' : '/v1/scan';
  const endpoint = `${apiUrl.replace(/\/+$/, '')}${endpointPath}`;

  // GitGuardian API format
  let payload;
  if (useMultiscan || documents.length > 1) {
    // Multi-scan format: always use array of documents
    payload = documents.map((d) => ({
      document: d.document,
      filename: d.filename,
    }));
  } else {
    // Single scan format: unwrap single document
    payload = {
      document: documents[0].document,
      filename: documents[0].filename,
    };
  }

  logger.warn('GitGuardian Request:', {
    endpoint,
    documentCount: documents.length,
    useMultiscan,
    payloadSize: JSON.stringify(payload).length,
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitGuardian API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    logger.warn('GitGuardian Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    logger.error('GitGuardian scan error:', error);
    throw error;
  }
}

// Handle extension icon click to trigger manual scan
chrome.action.onClicked.addListener(async (tab) => {
  logger.warn('Extension icon clicked, triggering manual scan on tab:', tab.id);

  try {
    // Send message to content script to trigger scan
    await chrome.tabs.sendMessage(tab.id, { action: 'manualScan' });
    logger.warn('Manual scan triggered successfully');
  } catch (error) {
    logger.error('Failed to trigger manual scan:', error);
  }
});
