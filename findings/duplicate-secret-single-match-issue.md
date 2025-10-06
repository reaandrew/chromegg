# GitGuardian API Finding: Single Match Returned for Multiple Occurrences of Same Secret

## Summary

When a secret appears multiple times within the same document, GitGuardian's scan API returns only a single match entry per policy break, even though the secret appears in multiple locations. This requires multiple scan iterations to detect and redact all instances of the same secret.

## Environment

- **API Endpoint**: `https://api.gitguardian.com/v1/scan`
- **Content Type**: YAML document with plain-text field values
- **GitGuardian Version**: Production API (2025-10-06)

## Problem Description

### Test Case

Document sent to GitGuardian containing the same secret twice:

```yaml
- field_id: textarea_textarea_message
  value: |
    - text: |
        headers = {"Authorization": "Bearer aoekthaoexukatoehsxkth8324AOX"}
      token: aoekthaoexukatoehsxkth8324AOX
```

**Secret**: `aoekthaoexukatoehsxkth8324AOX` (format based on [GitGuardian Bearer Token detector documentation](https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/generics/bearer_token)) appears on:
- Line 7: Inside the Bearer token string
- Line 8: As a standalone token value

### First Scan Response

```json
{
  "policy_break_count": 1,
  "policies": ["Secrets detection"],
  "policy_breaks": [
    {
      "type": "Bearer Token",
      "detector_name": "bearer_token",
      "matches": [
        {
          "type": "apikey",
          "match": "aoekthaoexukatoehsxkth8324AOX",
          "index_start": 176,
          "index_end": 204,
          "line_start": 7,
          "line_end": 7
        }
      ]
    }
  ]
}
```

**Result**: Only the occurrence on line 7 is returned.

### After First Redaction and Re-scan

After redacting the first occurrence and rescanning:

```json
{
  "policy_break_count": 1,
  "policies": ["Secrets detection"],
  "policy_breaks": [
    {
      "type": "Generic High Entropy Secret",
      "detector_name": "generic_high_entropy_secret",
      "matches": [
        {
          "type": "apikey",
          "match": "aoekthaoexukatoehsxkth8324AOX",
          "index_start": 202,
          "index_end": 230,
          "line_start": 8,
          "line_end": 8
        }
      ]
    }
  ]
}
```

**Result**: Now the occurrence on line 8 is returned (detected as a different type: "Generic High Entropy Secret" vs "Bearer Token").

## Impact

### Client-Side Challenges

1. **Multiple scan iterations required**: Clients must repeatedly scan and redact until no secrets are found
2. **Poor user experience**: Redaction happens incrementally, showing partial results
3. **Increased API usage**: Multiple API calls required for what should be a single operation
4. **Race conditions**: If user modifies content between scans, some secrets may be missed

### Observed Behavior

In our browser extension testing:
- User enters text with duplicate secret
- Extension scans and redacts first occurrence
- User must trigger another scan (by changing text) to detect second occurrence
- Two separate scans required to fully redact the same secret

## Expected Behavior

We would expect GitGuardian to return **all occurrences** of the same secret in a single scan response:

### Option A: Multiple match entries
```json
{
  "policy_breaks": [
    {
      "type": "Bearer Token",
      "matches": [
        {
          "match": "aoekthaoexukatoehsxkth8324AOX",
          "line_start": 7,
          "line_end": 7,
          "index_start": 176,
          "index_end": 204
        },
        {
          "match": "aoekthaoexukatoehsxkth8324AOX",
          "line_start": 8,
          "line_end": 8,
          "index_start": 202,
          "index_end": 230
        }
      ]
    }
  ]
}
```

### Option B: Single match with occurrence count
```json
{
  "policy_breaks": [
    {
      "type": "Bearer Token",
      "matches": [
        {
          "match": "aoekthaoexukatoehsxkth8324AOX",
          "occurrences": [
            { "line_start": 7, "line_end": 7, "index_start": 176, "index_end": 204 },
            { "line_start": 8, "line_end": 8, "index_start": 202, "index_end": 230 }
          ]
        }
      ]
    }
  ]
}
```

## Root Cause Analysis

It appears GitGuardian may be:
1. **Deduplicating secrets by value**: Only returning one instance per unique secret string
2. **Detector priority**: Different detectors (Bearer Token vs Generic High Entropy) may mask each other
3. **Performance optimization**: Limiting results to reduce response size

## Workaround Implemented

We implemented client-side logic to search for **all occurrences** of each returned secret match:

```javascript
matches.forEach((match) => {
  const matchText = match.match || '';

  // Find ALL occurrences of this secret in the field value
  let searchIndex = 0;
  while (searchIndex < fieldValue.length) {
    const idx = fieldValue.indexOf(matchText, searchIndex);
    if (idx === -1) break;

    positions.push({
      start: idx,
      end: idx + matchText.length,
      text: matchText,
    });

    searchIndex = idx + matchText.length;
  }
});
```

This ensures that when GitGuardian returns a secret match, we redact **all instances** of that secret in the document, not just the one at the reported line number.

## Performance Comparison

### Without Workaround
- Document with secret appearing N times
- Requires N separate API calls
- Total time: N × (network latency + scan time)

### With Workaround
- Document with secret appearing N times
- Requires 1 API call + client-side string search
- Total time: 1 × (network latency + scan time) + negligible client processing

## Reproduction Steps

1. Create a YAML document with the same secret appearing multiple times
2. Send to GitGuardian `/v1/scan` endpoint
3. Observe that only one match is returned despite multiple occurrences
4. Redact the returned match
5. Rescan the document
6. Observe that a second match is now returned for the same secret

## Recommendation

GitGuardian should return all occurrences of each detected secret in a single scan response, allowing clients to:
1. Redact all instances in one operation
2. Provide accurate metrics (e.g., "Found 2 occurrences of this secret")
3. Reduce API usage and improve performance
4. Deliver better user experience with complete, one-time redaction

Alternatively, if deduplication is intentional for performance reasons, document this behavior clearly and recommend that clients implement their own "find all" logic as we have done.
