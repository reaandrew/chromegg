/**
 * Background Service Worker for Chromegg Extension
 * Handles GitGuardian API requests to avoid CORS issues
 */

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
 * @param {Object} data - Request data containing apiUrl, apiKey, and documents
 * @returns {Promise<Object>} Scan results
 */
async function handleScanRequest(data) {
  const { apiUrl, apiKey, documents } = data;

  if (!apiUrl || !apiKey) {
    throw new Error('GitGuardian API URL and key are required');
  }

  const endpoint = `${apiUrl.replace(/\/+$/, '')}/v1/scan`;

  // GitGuardian API format: single document or multiple documents
  const payload =
    documents.length === 1
      ? { document: documents[0].document, filename: documents[0].filename }
      : {
          documents: documents.map((d) => ({
            document: d.document,
            filename: d.filename,
          })),
        };

  // Logging disabled for production - use for debugging:
  // console.warn('GitGuardian Request:', {
  //   endpoint,
  //   documentCount: documents.length,
  //   payloadJSON: JSON.stringify(payload, null, 2)
  // });

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
    // Logging disabled for production - use for debugging:
    // console.warn('GitGuardian Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('GitGuardian scan error:', error);
    throw error;
  }
}
