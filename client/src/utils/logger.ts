/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to display */
  minLevel: LogLevel;
  /** Whether to include timestamps */
  showTimestamp: boolean;
  /** Whether to include the log level */
  showLevel: boolean;
  /** Custom prefix for log messages */
  prefix?: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel:
    process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.DEBUG,
  showTimestamp: true,
  showLevel: true,
};

/**
 * LoggerService for consistent logging across the application
 */
export class LoggerService {
  private config: LoggerConfig;

  /**
   * Create a new logger instance
   * @param name Logger name/category
   * @param config Logger configuration
   */
  constructor(private name: string, config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Format a log message with timestamp, level, and prefix
   * @param level Log level
   * @param args Message arguments
   * @returns Formatted log arguments
   */
  private formatLogMessage(level: LogLevel, ...args: any[]): any[] {
    const parts: any[] = [];
    const styles: string[] = [];

    // Add timestamp if enabled
    if (this.config.showTimestamp) {
      const now = new Date();
      const timeStr = now.toISOString().split("T")[1].split("Z")[0];
      parts.push(`%c[${timeStr}]`);
      styles.push("color: gray; font-weight: normal;");
    }

    // Add log level if enabled
    if (this.config.showLevel) {
      const levelName = LogLevel[level];
      const levelColor = this.getLevelColor(level);
      parts.push(`%c[${levelName}]`);
      styles.push(`color: ${levelColor}; font-weight: bold;`);
    }

    // Add logger name
    parts.push(`%c[${this.name}]`);
    styles.push("color: #2f8cff; font-weight: bold;");

    // Add custom prefix if set
    if (this.config.prefix) {
      parts.push(`%c[${this.config.prefix}]`);
      styles.push("color: #a34cff; font-weight: normal;");
    }

    // Add message placeholder
    parts.push("%c");
    styles.push("color: inherit; font-weight: normal;");

    // Combine all parts into a single format string
    const formatStr = parts.join(" ");

    // Return formatted arguments
    return [formatStr, ...styles, ...args];
  }

  /**
   * Get a color for the log level
   * @param level Log level
   * @returns CSS color for the log level
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "#7a7a7a";
      case LogLevel.INFO:
        return "#2f8cff";
      case LogLevel.WARN:
        return "#ffc907";
      case LogLevel.ERROR:
        return "#ff5252";
      default:
        return "inherit";
    }
  }

  /**
   * Check if a log level should be displayed
   * @param level Log level to check
   * @returns Whether the log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  /**
   * Log a debug message
   * @param args Message arguments
   */
  public debug(...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(...this.formatLogMessage(LogLevel.DEBUG, ...args));
  }

  /**
   * Log an info message
   * @param args Message arguments
   */
  public info(...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(...this.formatLogMessage(LogLevel.INFO, ...args));
  }

  /**
   * Log a warning message
   * @param args Message arguments
   */
  public warn(...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(...this.formatLogMessage(LogLevel.WARN, ...args));
  }

  /**
   * Log an error message
   * @param args Message arguments
   */
  public error(...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(...this.formatLogMessage(LogLevel.ERROR, ...args));
  }

  /**
   * Measure performance of a function
   * @param name Operation name
   * @param fn Function to measure
   * @returns Result of the function
   */
  public measure<T>(name: string, fn: () => T): T {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.debug(`${name} took ${duration.toFixed(2)}ms`);

    return result;
  }

  /**
   * Measure performance of an async function
   * @param name Operation name
   * @param fn Async function to measure
   * @returns Promise with the result of the function
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return fn();
    }

    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.debug(`${name} took ${duration.toFixed(2)}ms`);

    return result;
  }

  /**
   * Create a child logger with additional prefix
   * @param prefix Additional prefix for the logger
   * @returns Child logger instance
   */
  public child(prefix: string): LoggerService {
    return new LoggerService(this.name, {
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /**
   * Set minimum log level
   * @param level Minimum log level
   */
  public setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
}

/**
 * Create named loggers for different parts of the application
 */
export const appLogger = new LoggerService("App");
export const apiLogger = new LoggerService("API");
export const rtcLogger = new LoggerService("WebRTC");
export const uiLogger = new LoggerService("UI");

/**
 * Default logger instance
 */
export default appLogger;
