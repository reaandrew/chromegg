import { chunkYaml } from './chunker.js';

describe('chunkYaml', () => {
  test('returns single chunk when content is under 1MB', () => {
    const yaml = `- field_id: field1
  value: |
    test value 1
- field_id: field2
  value: |
    test value 2
`;

    const chunks = chunkYaml(yaml, 'test');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].document).toBe(yaml);
    expect(chunks[0].filename).toBe('test.yaml');
    expect(chunks[0].fieldIds).toEqual(['field1', 'field2']);
  });

  test('splits large content into multiple chunks', () => {
    // Create a large field value (over 1MB)
    const largeValue = 'x'.repeat(600 * 1024); // 600KB
    const yaml = `- field_id: field1
  value: |
    ${largeValue}
- field_id: field2
  value: |
    ${largeValue}
`;

    const chunks = chunkYaml(yaml, 'test');

    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should have at least one field
    chunks.forEach((chunk) => {
      expect(chunk.fieldIds.length).toBeGreaterThan(0);
      expect(chunk.filename).toContain('test_chunk_');
    });
  });

  test('handles empty content', () => {
    const chunks = chunkYaml('', 'test');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].document).toBe('');
    expect(chunks[0].fieldIds).toEqual([]);
  });

  test('correctly extracts field IDs', () => {
    const yaml = `- field_id: input_text_username
  value: |
    john
- field_id: input_email_email
  value: |
    john@example.com
- field_id: textarea_message
  value: |
    Hello
    World
`;

    const chunks = chunkYaml(yaml, 'test');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].fieldIds).toEqual([
      'input_text_username',
      'input_email_email',
      'textarea_message',
    ]);
  });

  test('skips fields that exceed MAX_CHUNK_SIZE', () => {
    // Create a field that exceeds 1MB
    const tooLargeValue = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const yaml = `- field_id: field1
  value: |
    ${tooLargeValue}
- field_id: field2
  value: |
    normal value
`;

    const chunks = chunkYaml(yaml, 'test');

    // field1 should be skipped, only field2 should be included
    expect(chunks).toHaveLength(1);
    expect(chunks[0].fieldIds).toEqual(['field2']);
    expect(chunks[0].document).toContain('field2');
    expect(chunks[0].document).not.toContain('field1');
  });

  test('handles multiline field values', () => {
    const yaml = `- field_id: textarea1
  value: |
    Line 1
    Line 2
    Line 3
- field_id: textarea2
  value: |
    Another
    multiline
    value
`;

    const chunks = chunkYaml(yaml, 'test');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].document).toBe(yaml);
    expect(chunks[0].fieldIds).toEqual(['textarea1', 'textarea2']);
  });

  test('distributes fields across chunks efficiently', () => {
    // Create multiple medium-sized fields
    const mediumValue = 'x'.repeat(400 * 1024); // 400KB each
    const yaml = `- field_id: field1
  value: |
    ${mediumValue}
- field_id: field2
  value: |
    ${mediumValue}
- field_id: field3
  value: |
    ${mediumValue}
`;

    const chunks = chunkYaml(yaml, 'test');

    // Should split into at least 2 chunks (2 fields of 400KB each = 800KB fits in 1MB)
    // But 3 fields would exceed, so at least 2 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // All fields should be included
    const allFieldIds = chunks.flatMap((c) => c.fieldIds);
    expect(allFieldIds).toContain('field1');
    expect(allFieldIds).toContain('field2');
    expect(allFieldIds).toContain('field3');
  });

  test('chunks YAML when current chunk would exceed limit', () => {
    // Create fields that together exceed 1MB but individually fit
    const mediumValue = 'x'.repeat(600 * 1024); // 600KB each
    const yaml = `- field_id: field1
  value: |
    ${mediumValue}
- field_id: field2
  value: |
    ${mediumValue}
`;

    const chunks = chunkYaml(yaml, 'test');

    // Should create 2 chunks since adding field2 to field1's chunk would exceed 1MB
    expect(chunks.length).toBe(2);
    expect(chunks[0].fieldIds).toEqual(['field1']);
    expect(chunks[1].fieldIds).toEqual(['field2']);
  });
});
