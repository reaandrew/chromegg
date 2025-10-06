// Handle saving and loading GitGuardian API credentials from Chrome storage

const saveButton = document.getElementById('saveButton');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const statusDiv = document.getElementById('status');

// Load saved credentials when page opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['apiUrl', 'apiKey'], (result) => {
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
});

// Save credentials when button clicked
saveButton.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl) {
    showStatus('Please enter the GitGuardian API URL', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Please enter the GitGuardian API key', 'error');
    return;
  }

  chrome.storage.sync.set({ apiUrl: apiUrl, apiKey: apiKey }, () => {
    if (chrome.runtime.lastError) {
      showStatus(
        'Error saving settings: ' + chrome.runtime.lastError.message,
        'error'
      );
    } else {
      showStatus('Settings saved successfully!', 'success');
    }
  });
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Allow saving with Enter key
apiUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveButton.click();
  }
});

apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveButton.click();
  }
});
