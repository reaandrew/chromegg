/**
 * YAML Chunker for GitGuardian API
 * Splits YAML content into chunks that fit within GitGuardian's 1MB payload limit
 */

// Logger is available globally from logger.js
/* global logger */

const MAX_CHUNK_SIZE = 1024 * 1024; // 1 MB in bytes

/**
 * Calculate the byte size of a string in UTF-8
 * @param {string} str - String to measure
 * @returns {number} Size in bytes
 */
function getByteSize(str) {
  // Use TextEncoder in browser, Buffer in Node
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  } else {
    // Node.js environment (for tests)
    // eslint-disable-next-line no-undef
    return Buffer.byteLength(str, 'utf8');
  }
}

/**
 * Chunk YAML content by splitting field entries
 * @param {string} yamlContent - YAML string to chunk
 * @param {string} baseFilename - Base filename for chunks
 * @returns {Array<Object>} Array of chunks with {document, filename, fieldIds}
 */
export function chunkYaml(yamlContent, baseFilename = 'form_data') {
  // If already under the limit, return as single chunk
  if (getByteSize(yamlContent) <= MAX_CHUNK_SIZE) {
    // Extract field IDs from the YAML
    const fieldIds = extractFieldIds(yamlContent);
    return [
      {
        document: yamlContent,
        filename: `${baseFilename}.yaml`,
        fieldIds: fieldIds,
      },
    ];
  }

  // Split YAML into individual field entries
  const fieldEntries = splitYamlFields(yamlContent);

  if (fieldEntries.length === 0) {
    return [];
  }

  // Group entries into chunks that fit within MAX_CHUNK_SIZE
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (const entry of fieldEntries) {
    const entrySize = getByteSize(entry.yaml);

    // If a single entry exceeds MAX_CHUNK_SIZE, we have a problem
    if (entrySize > MAX_CHUNK_SIZE) {
      if (typeof logger !== 'undefined') {
        logger.warn(
          `Field ${entry.fieldId} exceeds MAX_CHUNK_SIZE (${entrySize} bytes). Skipping.`
        );
      }
      continue;
    }

    // If adding this entry would exceed the limit, start a new chunk
    if (currentSize + entrySize > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(createChunkObject(currentChunk, baseFilename, chunks.length));
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(entry);
    currentSize += entrySize;
  }

  // Add the last chunk if it has any entries
  if (currentChunk.length > 0) {
    chunks.push(createChunkObject(currentChunk, baseFilename, chunks.length));
  }

  return chunks;
}

/**
 * Split YAML content into individual field entries
 * @param {string} yamlContent - YAML content to split
 * @returns {Array<Object>} Array of {fieldId, yaml} objects
 */
function splitYamlFields(yamlContent) {
  const entries = [];
  const lines = yamlContent.split('\n');
  let currentEntry = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is the start of a new field entry
    if (line.startsWith('- field_id: ')) {
      // Save the previous entry if it exists
      if (currentEntry) {
        entries.push({
          fieldId: currentEntry,
          yaml: currentLines.join('\n') + '\n',
        });
      }

      // Start a new entry
      currentEntry = line.substring('- field_id: '.length).trim();
      currentLines = [line];
    } else {
      // Continue the current entry
      if (currentEntry) {
        currentLines.push(line);
      }
    }
  }

  // Don't forget the last entry
  if (currentEntry && currentLines.length > 0) {
    entries.push({
      fieldId: currentEntry,
      yaml: currentLines.join('\n') + '\n',
    });
  }

  return entries;
}

/**
 * Create a chunk object from field entries
 * @param {Array<Object>} entries - Array of field entries
 * @param {string} baseFilename - Base filename
 * @param {number} chunkIndex - Index of this chunk
 * @returns {Object} Chunk object
 */
function createChunkObject(entries, baseFilename, chunkIndex) {
  const yamlContent = entries.map((e) => e.yaml).join('');
  const fieldIds = entries.map((e) => e.fieldId);

  return {
    document: yamlContent,
    filename: `${baseFilename}_chunk_${chunkIndex}.yaml`,
    fieldIds: fieldIds,
  };
}

/**
 * Extract field IDs from YAML content
 * @param {string} yamlContent - YAML content
 * @returns {Array<string>} Array of field IDs
 */
function extractFieldIds(yamlContent) {
  const fieldIds = [];
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('- field_id: ')) {
      const fieldId = line.substring('- field_id: '.length).trim();
      fieldIds.push(fieldId);
    }
  }

  return fieldIds;
}

// Make available globally for content scripts
if (typeof globalThis !== 'undefined') {
  globalThis.chunkYaml = chunkYaml;
}
