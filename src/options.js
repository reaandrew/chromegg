// Handle saving and loading GitGuardian API credentials from Chrome storage

const saveButton = document.getElementById('saveButton');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const debugModeCheckbox = document.getElementById('debugMode');
const autoRedactCheckbox = document.getElementById('autoRedact');
const redactTextInput = document.getElementById('redactText');
const statusDiv = document.getElementById('status');

// Load saved credentials when page opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(
    ['apiUrl', 'apiKey', 'debugMode', 'autoRedact', 'redactText'],
    (result) => {
      if (result.apiUrl) {
        apiUrlInput.value = result.apiUrl;
      }
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
      if (result.debugMode !== undefined) {
        debugModeCheckbox.checked = result.debugMode;
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

// Save credentials when button clicked
saveButton.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const debugMode = debugModeCheckbox.checked;
  const autoRedact = autoRedactCheckbox.checked;
  const redactText = redactTextInput.value || 'REDACTED';

  if (!apiUrl) {
    showStatus('Please enter the GitGuardian API URL', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Please enter the GitGuardian API key', 'error');
    return;
  }

  chrome.storage.sync.set(
    {
      apiUrl: apiUrl,
      apiKey: apiKey,
      debugMode: debugMode,
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
      }
    }
  );
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
