// Handle saving and loading GitGuardian API credentials from Chrome storage

const saveButton = document.getElementById('saveButton');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const apiKeyMasked = document.getElementById('apiKeyMasked');
const changeApiKeyLink = document.getElementById('changeApiKey');
const debugModeCheckbox = document.getElementById('debugMode');
const continuousModeCheckbox = document.getElementById('continuousMode');
const autoRedactCheckbox = document.getElementById('autoRedact');
const redactTextInput = document.getElementById('redactText');
const statusDiv = document.getElementById('status');

// Load saved credentials when page opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(
    [
      'apiUrl',
      'apiKey',
      'debugMode',
      'continuousMode',
      'autoRedact',
      'redactText',
    ],
    (result) => {
      if (result.apiUrl) {
        apiUrlInput.value = result.apiUrl;
      } else {
        // Default to GitGuardian API URL if not set
        apiUrlInput.value = 'https://api.gitguardian.com';
      }
      if (result.apiKey && result.apiKey.trim()) {
        // API key exists - show masked version
        apiKeyInput.style.display = 'none';
        apiKeyMasked.style.display = 'flex';
      } else {
        // No API key - show input field
        apiKeyInput.style.display = 'block';
        apiKeyMasked.style.display = 'none';
      }
      if (result.debugMode !== undefined) {
        debugModeCheckbox.checked = result.debugMode;
      }
      if (result.continuousMode !== undefined) {
        continuousModeCheckbox.checked = result.continuousMode;
      } else {
        // Default to false (manual mode)
        continuousModeCheckbox.checked = false;
      }
      if (result.autoRedact !== undefined) {
        autoRedactCheckbox.checked = result.autoRedact;
      } else {
        // Default to true
        autoRedactCheckbox.checked = true;
      }
      if (result.redactText !== undefined) {
        redactTextInput.value = result.redactText;
      }
    }
  );
});

// Handle "Change" link click
changeApiKeyLink.addEventListener('click', (e) => {
  e.preventDefault();
  apiKeyMasked.style.display = 'none';
  apiKeyInput.style.display = 'block';
  apiKeyInput.value = '';
  apiKeyInput.focus();
});

// Save credentials when button clicked
saveButton.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim();
  const debugMode = debugModeCheckbox.checked;
  const continuousMode = continuousModeCheckbox.checked;
  const autoRedact = autoRedactCheckbox.checked;
  const redactText = redactTextInput.value || 'REDACTED';

  if (!apiUrl) {
    showStatus('Please enter the GitGuardian API URL', 'error');
    return;
  }

  // Get API key - use existing if not changing
  chrome.storage.sync.get(['apiKey'], (result) => {
    let apiKey;

    if (apiKeyInput.style.display !== 'none') {
      // Input is visible - user is entering/changing key
      apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        showStatus('Please enter the GitGuardian API key', 'error');
        return;
      }
    } else {
      // Input is hidden - use existing key
      apiKey = result.apiKey;
    }

    chrome.storage.sync.set(
      {
        apiUrl: apiUrl,
        apiKey: apiKey,
        debugMode: debugMode,
        continuousMode: continuousMode,
        autoRedact: autoRedact,
        redactText: redactText,
      },
      () => {
        if (chrome.runtime.lastError) {
          showStatus(
            'Error saving settings: ' + chrome.runtime.lastError.message,
            'error'
          );
        } else {
          showStatus('Settings saved successfully!', 'success');
          // Hide the input and show masked version
          if (apiKeyInput.style.display !== 'none') {
            apiKeyInput.style.display = 'none';
            apiKeyMasked.style.display = 'flex';
          }
        }
      }
    );
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
