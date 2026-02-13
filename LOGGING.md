# DraftCut Developer Logging Guide

This document explains the comprehensive logging system added to DraftCut for debugging and error diagnosis.

## Overview

A centralized logging utility (`src/lib/logger.ts`) has been integrated throughout DraftCut to provide detailed, timestamped logs of all major operations. Logs are color-coded by level and available in the browser console.

## Accessing Logs

### 1. Browser Console
Open the browser's Developer Tools (F12 or Cmd+Option+I) and look at the **Console** tab.

All logs appear with:
- **Timestamp**: HH:mm:ss.SSS
- **Level**: DEBUG, INFO, WARN, or ERROR (color-coded)
- **Source**: Which component/module generated the log
- **Message**: Human-readable description
- **Data**: JSON object with relevant context (if applicable)

Example output:
```
[16:21:45.234] [INFO] [VideoGeneration] Starting video spec generation {provider: 'claude', model: 'claude-sonnet-4-5-20250929', assetCount: 3}
[16:21:45.456] [DEBUG] [VideoGeneration] Anthropic client created
[16:21:47.123] [INFO] [VideoGeneration] Claude API response received {stopReason: 'end_turn', inputTokens: 4250, outputTokens: 1892}
```

### 2. Global Commands in Console

The logger exposes helper functions accessible from the console:

#### Get all logs
```javascript
draftcutLogs()
```
Prints all stored logs to the console (limited to last 1000 entries).

#### Get error logs only
```javascript
draftcutLogsError()
```
Prints only ERROR-level logs as plain text, useful for sharing error messages.

#### Export logs to JSON file
```javascript
draftcutExportLogs()
```
Downloads a JSON file `draftcut-logs-[timestamp].json` with complete log history. Useful for attaching to bug reports.

#### Access logger directly
```javascript
draftcutLogger.getLogs()           // Get all logs
draftcutLogger.getLogs('error')    // Get only errors
draftcutLogger.getLogsAsText()     // Get all logs as formatted text
draftcutLogger.clear()             // Clear log history
```

## What's Being Logged

### Video Generation Pipeline
- **Provider selection** and configuration
- **API request initiation** with model and token limits
- **API responses** with usage statistics
- **JSON parsing** and cleanup
- **Asset validation** and filtering
- **ProjectSpec validation** with detailed error reporting
- **Agentic refinement** iterations and scores

**Source**: `VideoGeneration`

### State Management (Zustand Stores)
- **Project updates**: Spec changes, asset additions/removals, blob URLs
- **Editor state**: Playback state, clip selection, timeline zoom
- **Chat operations**: Message additions, generation status

**Sources**: `ProjectStore`, `EditorStore`, `ChatStore`

### Home Page Flow
- **Generation requests** with asset count and prompt length
- **Website scraping** operations with results (images, colors)
- **Music generation** with service selection (Beatoven vs. Replicate)
- **Asset saving** operations
- **Error handling** with full error messages and stack traces

**Source**: `HomePage`

### Data Validation
- **Validation start** and **completion**
- **Validation errors** with detailed error paths
- **Asset count** and **track information** on success

**Source**: `Validator`

## Log Levels Explained

### DEBUG 🔵
Low-priority diagnostic information. Good for understanding the execution flow but can be noisy.
- Function entry/exit points
- Intermediate state changes
- Detailed data inspection

### INFO 🔷
Important milestones and state changes that should happen during normal operation.
- Generation start/completion
- API calls initiated
- Major state updates
- User actions

### WARN 🟠
Recoverable issues or unexpected conditions that don't prevent operation.
- Missing configuration
- API warnings
- Partial failures (e.g., website scrape returned no colors)

### ERROR 🔴
Errors that prevent normal operation or critical failures.
- API errors
- Validation failures
- Unhandled exceptions
- Generation failures

## Troubleshooting With Logs

### Video Generation Fails
1. Open the browser console (F12)
2. Run `draftcutLogsError()` to see all errors
3. Look for ERROR logs from `VideoGeneration` source
4. Check the error message and data for:
   - API error responses
   - Invalid API key
   - Network errors
   - JSON parsing failures

### Expected Assets Missing
1. Check logs from `HomePage` source
2. Look for `setAssets` or `Adding asset` messages
3. Verify asset count matches expectations
4. Check for any scraping or music generation failures

### Playback Issues
1. Look at `EditorStore` logs for playback state changes
2. Check `ProjectStore` logs for blob URL operations
3. Verify asset blob URLs were set correctly

### Validation Errors
1. Check `Validator` source logs
2. Error logs will show:
   - Which field failed validation
   - What was expected vs. received
   - Complete validation error stack

## Sharing Logs for Bug Reports

To help debug issues, export your logs:

1. Reproduce the issue
2. Run in console: `draftcutExportLogs()`
3. A JSON file will download automatically
4. Attach this file to your bug report or share with developers

The JSON file contains:
- All logs with timestamps
- Log level and source
- Complete data context
- Execution timeline

## Disabling/Filtering Logs

Currently, all logs are enabled by default. To reduce noise:

1. **In browser console**, use built-in filter:
   - Click the filter icon 🔍
   - Enter a source name like `VideoGeneration` to show only those logs
   - Enter `ERROR` to show only errors

2. **In code** (if needed), modify logging statements:
   - Remove logger calls from debug operations
   - Use `logger.info()` instead of `logger.debug()` for less noise

## Performance Impact

The logging system has minimal performance impact:
- Logs are stored in memory (max 1000 entries)
- Console output is throttled by the browser
- Logger adds <1ms overhead per operation
- No data is sent to external servers

## Examples

### Example 1: Debugging API Key Issues

User reports: "Generation keeps failing"

1. User opens console and runs: `draftcutLogsError()`
2. Output shows:
   ```
   [16:21:45.123] [ERROR] [VideoGeneration] Provider API error {status: 401, errorText: 'Unauthorized'}
   ```
3. Issue identified: Invalid API key
4. User adds correct API key and retries

### Example 2: Collecting Data for Bug Report

User encounters issue, wants to report it:

1. Open console
2. Type: `draftcutExportLogs()`
3. JSON file `draftcut-logs-2026-02-12T16-21-45.json` downloads
4. User attaches to bug report
5. Developer opens file and can see complete execution history leading to the bug

### Example 3: Understanding Video Generation

Developer wants to trace the full generation flow:

1. Open console
2. Type: `draftcutLogger.getLogs()` to see raw log objects with all details
3. Or type: `draftcutLogger.getLogsAsText()` for readable text format
4. Search for messages containing specific keywords

## Future Improvements

Potential enhancements to the logging system:
- Log persistence across page reloads
- Remote logging to help with error tracking
- Performance metrics and timing analysis
- Structured log filtering UI
- Integration with error reporting services

---

**Happy debugging!** The logs should help you quickly identify issues and understand what's happening in your videos generation.
