/**
 * Centralized logging utility for DraftCut
 * All console logs go through this to maintain consistency and enable easy filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatTimestamp(): string {
    return new Date().toISOString().split('T')[1]; // HH:mm:ss.SSS
  }

  private createEntry(level: LogLevel, source: string, message: string, data?: unknown): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      source,
      message,
      data,
    };
  }

  private output(entry: LogEntry): void {
    // Store in memory for later retrieval
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with color coding
    const colors = {
      debug: 'color: #888; font-weight: normal',
      info: 'color: #0066cc; font-weight: bold',
      warn: 'color: #ff6600; font-weight: bold',
      error: 'color: #cc0000; font-weight: bold',
    };

    const style = colors[entry.level];
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;

    if (entry.data !== undefined) {
      console.log(`%c${prefix} ${entry.message}`, style, entry.data);
    } else {
      console.log(`%c${prefix} ${entry.message}`, style);
    }
  }

  debug(source: string, message: string, data?: unknown): void {
    this.output(this.createEntry('debug', source, message, data));
  }

  info(source: string, message: string, data?: unknown): void {
    this.output(this.createEntry('info', source, message, data));
  }

  warn(source: string, message: string, data?: unknown): void {
    this.output(this.createEntry('warn', source, message, data));
  }

  error(source: string, message: string, data?: unknown): void {
    this.output(this.createEntry('error', source, message, data));
  }

  /**
   * Get all logs or filtered by level
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return this.logs;
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get logs as formatted string for copying to clipboard/sharing
   */
  getLogsAsText(level?: LogLevel): string {
    const logsToFormat = this.getLogs(level);
    return logsToFormat
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`)
      .join('\n');
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    console.log('%c[LOGGER] Logs cleared', 'color: #0066cc; font-weight: bold');
  }

  /**
   * Export logs to a JSON file
   */
  exportLogs(): void {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draftcut-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();

// Make available globally for console access
(globalThis as any).draftcutLogger = logger;
(globalThis as any).draftcutLogs = () => console.log(logger.getLogs());
(globalThis as any).draftcutLogsError = () => console.log(logger.getLogsAsText('error'));
(globalThis as any).draftcutExportLogs = () => logger.exportLogs();
