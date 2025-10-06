# GitGuardian API Finding: Base64-Encoded Content Match Extraction Issue

## Summary

When scanning content that contains base64-encoded field values (JSON format with base64-encoded strings), GitGuardian correctly detects secrets within the base64-encoded content but returns `match` values that are substrings of the base64-encoded payload rather than the actual plain-text secret or a proper base64-encoded representation of the secret.

## Environment

- **API Endpoint**: `https://api.gitguardian.com/v1/scan`
- **Content Type**: JSON document with base64-encoded field values
- **GitGuardian Version**: Production API (2025-10-06)

## Problem Description

### Original Approach

We initially sent form data to GitGuardian in JSON format with base64-encoded values:

```json
{
  "fields": [
    {
      "id": "textarea_textarea_message",
      "value": "LSB0ZXh0OiB8CiAgICBoZWFkZXJzID0geyJBdXRob3JpemF0aW9uIjogIkJlYXJlciBhb2VrdGhhb2V4dWthdG9laHN4a3RoODMyNEFPWCJ9CiAgdG9rZW46IGFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y"
    }
  ]
}
```

**Decoded value**:
```
- text: |
    headers = {"Authorization": "Bearer aoekthaoexukatoehsxkth8324AOX"}
  token: aoekthaoexukatoehsxkth8324AOX
```

**Secret detected**: `aoekthaoexukatoehsxkth8324AOX`

### GitGuardian Response

```json
{
  "policy_break_count": 1,
  "policies": ["Secrets detection"],
  "policy_breaks": [
    {
      "type": "Base64 Generic High Entropy Secret",
      "matches": [
        {
          "type": "apikey",
          "match": "GFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y",
          "index_start": 296,
          "index_end": 334,
          "line_start": 9,
          "line_end": 9
        }
      ]
    }
  ]
}
```

### Analysis

1. **The `match` value** (`GFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y`) is a substring of the base64 payload we sent:
   - Full base64: `LSB0ZXh0OiB8CiAgICBoZWFkZXJzID0geyJBdXRob3JpemF0aW9uIjogIkJlYXJlciBhb2VrdGhhb2V4dWthdG9laHN4a3RoODMyNEFPWCJ9CiAgdG9rZW46IGFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y`
   - Match substring at position 121: `GFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y`

2. **The substring is NOT valid base64** by itself - attempting to decode it produces garbage:
   ```
   $ echo "GFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y" | base64 -d
   [binary garbage output]
   ```

3. **The substring is NOT the base64-encoded secret**:
   - Secret: `aoekthaoexukatoehsxkth8324AOX`
   - Base64 of secret: `YW9la3RoYW9leHVrYXRvZWhzeGt0aDgzMjRBT1g=`
   - GitGuardian match: `GFvZWt0aGFvZXh1a2F0b2Voc3hrdGg4MzI0QU9Y` ❌ (different)

4. **The `index_start` and `index_end`** values (296-334) refer to positions within the JSON document, not positions within the decoded field value, making it impossible to map back to the original field content for redaction.

## Impact

This makes it extremely difficult to:
1. Extract the actual secret text for redaction purposes
2. Map the match back to specific field values in the original form data
3. Implement automatic redaction features in browser extensions or client applications

## Expected Behavior

We would expect one of the following:

### Option A: Return the plain-text secret
```json
{
  "match": "aoekthaoexukatoehsxkth8324AOX"
}
```

### Option B: Return the base64-encoded secret with metadata
```json
{
  "match": "YW9la3RoYW9leHVrYXRvZWhzeGt0aDgzMjRBT1g=",
  "decoded_match": "aoekthaoexukatoehsxkth8324AOX",
  "encoding": "base64"
}
```

### Option C: Provide field-level indices
```json
{
  "match": "aoekthaoexukatoehsxkth8324AOX",
  "field_id": "textarea_textarea_message",
  "field_index_start": 48,
  "field_index_end": 76
}
```

## Workaround Implemented

We switched from JSON with base64-encoded values to **YAML with plain-text multiline values**:

```yaml
- field_id: textarea_textarea_message
  value: |
    - text: |
        headers = {"Authorization": "Bearer aoekthaoexukatoehsxkth8324AOX"}
      token: aoekthaoexukatoehsxkth8324AOX
```

With YAML format:
- GitGuardian returns the actual plain-text secret in `match`: `"aoekthaoexukatoehsxkth8324AOX"`
- Line numbers map correctly to field boundaries
- We can directly search for and redact the secret in field values

## Reproduction Steps

1. Create a JSON document with base64-encoded field values containing secrets
2. Send to GitGuardian `/v1/scan` endpoint
3. Observe that `match` values are base64 substrings rather than the actual secret
4. Attempt to decode the `match` value - it will fail or produce garbage
5. Attempt to use `index_start`/`index_end` to locate secret in original field - positions don't map correctly

## Recommendation

For base64-encoded content detection, GitGuardian should return the decoded secret text in the `match` field, or provide additional metadata that allows clients to accurately locate and redact secrets in the original (decoded) content.
